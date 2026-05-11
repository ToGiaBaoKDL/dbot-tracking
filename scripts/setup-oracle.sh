#!/usr/bin/env bash
set -euo pipefail

echo "=== DBOT Tracker — Oracle Cloud VM Setup ==="
echo "This script hardens a fresh Ubuntu 22.04 VM for production."
echo ""

# ---------------------------------------------------------------------------
# 1. System update
# ---------------------------------------------------------------------------
echo "[1/8] Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y \
  curl wget git htop ufw fail2ban cron \
  apt-transport-https ca-certificates gnupg lsb-release

# ---------------------------------------------------------------------------
# 2. Create non-root user (optional — Oracle already creates ubuntu user)
# ---------------------------------------------------------------------------
USERNAME="${DEPLOY_USER:-ubuntu}"
if ! id "$USERNAME" &>/dev/null; then
  useradd -m -s /bin/bash "$USERNAME"
  usermod -aG sudo "$USERNAME"
  echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-$USERNAME
fi

# ---------------------------------------------------------------------------
# 3. SSH hardening
# ---------------------------------------------------------------------------
echo "[2/8] Hardening SSH..."
SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup original
cp "$SSHD_CONFIG" "$SSHD_CONFIG.bak.$(date +%s)"

# Apply hardening
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONFIG"
sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' "$SSHD_CONFIG"
sed -i 's/^#*ClientAliveInterval.*/ClientAliveInterval 300/' "$SSHD_CONFIG"
sed -i 's/^#*ClientAliveCountMax.*/ClientAliveCountMax 2/' "$SSHD_CONFIG"

systemctl restart sshd
systemctl enable sshd

# ---------------------------------------------------------------------------
# 4. UFW firewall — deny everything, allow nothing externally
#    (Cloudflare Tunnel handles all inbound traffic)
# ---------------------------------------------------------------------------
echo "[3/8] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
# Allow SSH (critical — do not disable or you will be locked out)
ufw allow ssh
ufw --force enable
systemctl enable ufw

# ---------------------------------------------------------------------------
# 5. fail2ban
# ---------------------------------------------------------------------------
echo "[4/8] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban

# ---------------------------------------------------------------------------
# 6. Docker + Docker Compose
# ---------------------------------------------------------------------------
echo "[5/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

usermod -aG docker "$USERNAME"
systemctl enable docker
systemctl start docker

# Create app directory
mkdir -p /opt/dbot-tracking
chown "$USERNAME:$USERNAME" /opt/dbot-tracking

# ---------------------------------------------------------------------------
# 7. Swap (critical for low-RAM VMs)
# ---------------------------------------------------------------------------
echo "[6/8] Setting up swap..."
if ! swapon --show | grep -q "/swapfile"; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi
# Idempotent fstab entry
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
# Idempotent sysctl entry
grep -q '^vm.swappiness=10' /etc/sysctl.conf || echo "vm.swappiness=10" >> /etc/sysctl.conf
sysctl -p

# ---------------------------------------------------------------------------
# 8. Docker log rotation (prevents disk full)
# ---------------------------------------------------------------------------
echo "[7/8] Configuring Docker log rotation..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

# ---------------------------------------------------------------------------
# 9. Auto-updates for security patches
# ---------------------------------------------------------------------------
echo "[8/8] Enabling unattended security updates..."
apt-get install -y unattended-upgrades
systemctl enable unattended-upgrades
systemctl start unattended-upgrades

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Log out and log back in (or run 'newgrp docker') to apply Docker group"
echo "  2. Add your SSH public key to ~$USERNAME/.ssh/authorized_keys"
echo "  3. Copy .env file to /opt/dbot-tracking/.env"
echo "  4. Clone repo: git clone https://github.com/YOUR_REPO/dbot-tracking.git /opt/dbot-tracking"
echo "  5. Run: cd /opt/dbot-tracking && bash scripts/deploy-oracle.sh"
echo ""
echo "Security notes:"
echo "  - SSH password auth: DISABLED"
echo "  - Root login: DISABLED"
echo "  - UFW: deny all incoming (allow SSH from your IP only)"
echo "  - fail2ban: active on SSH"
echo "  - Swap: 2 GB enabled"
echo "  - Auto-updates: enabled"
echo ""
echo "IMPORTANT: If you locked yourself out, use Oracle Cloud Console"
echo "           VNC/serial console to regain access."
