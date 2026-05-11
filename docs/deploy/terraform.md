# Deploy with Terraform

Infrastructure as Code for Oracle Cloud using Terraform.

## What Gets Created

| Resource | Config |
|----------|--------|
| **Compute** | VM.Standard.A1.Flex, 2 OCPU, 12 GB RAM, 100 GB boot volume |
| **VCN** | 10.0.0.0/16 with public subnet 10.0.0.0/24 |
| **Security** | Ingress 22/tcp only, egress all |
| **Object Storage** | `dbot-backups` bucket (Standard tier) |

## Prerequisites

1. **Terraform >= 1.5**
   ```bash
   # macOS
   brew install terraform

   # Ubuntu/Debian
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   ```

2. **OCI API Key**
   ```bash
   mkdir -p ~/.oci
   openssl genrsa -out ~/.oci/oci_api_key.pem 2048
   chmod 600 ~/.oci/oci_api_key.pem
   openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
   ```
   Then upload the **public key** to OCI Console:
   - Profile (top-right) → **User Settings** → **API Keys** → **Add API Key**
   - Paste the public key content → copy the **Fingerprint**

3. **Collect OCIDs**
   | Value | Where to find |
   |-------|---------------|
   | `tenancy_ocid` | OCI Console → Profile → **Tenancy** → copy OCID |
   | `user_ocid` | OCI Console → Profile → **User Settings** → copy OCID |
   | `compartment_ocid` | OCI Console → **Identity & Security** → **Compartments** → copy OCID |
   | `region` | OCI Console URL or **Regions** in menu (e.g. `ap-singapore-1`) |

## Configure

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
tenancy_ocid     = "ocid1.tenancy.oc1..xxxxxxxx"
user_ocid        = "ocid1.user.oc1..xxxxxxxx"
fingerprint      = "xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
private_key_path = "~/.oci/oci_api_key.pem"
region           = "ap-singapore-1"
compartment_ocid = "ocid1.compartment.oc1..xxxxxxxx"
```

> **Security:** `terraform.tfvars` is gitignored. Never commit it.

## Deploy

```bash
terraform init
terraform plan
terraform apply
```

After `apply`, Terraform outputs:
- `instance_public_ip` — SSH into this IP
- `bucket_namespace` — needed for `.env` (rclone config)
- `bucket_name` — e.g. `dbot-backups`

## Post-Deploy Steps

1. **SSH into the instance** (wait ~2 minutes for cloud-init to finish):
   ```bash
   ssh -i ~/.ssh/id_rsa ubuntu@<instance_public_ip>
   ```

2. **Verify setup completed:**
   ```bash
   tail -f /var/log/cloud-init-output.log
   ```

3. **Copy `.env`, fill in values, and deploy:**
   ```bash
   cd /opt/dbot-tracking
   cp .env.example .env
   nano .env
   ```
   Use Terraform outputs for OOS values:
   ```
   OOS_NAMESPACE=<bucket_namespace output>
   OOS_BUCKET=<bucket_name output>
   ```
   Then deploy:
   ```bash
   make deploy-oracle
   ```

## Update Infrastructure

Edit variables or module files, then:

```bash
terraform plan
terraform apply
```

## Destroy

```bash
terraform destroy
```

> **Warning:** This deletes the instance and bucket. Ensure you have backups or are okay with data loss.

## State Management

By default, state is stored locally in `terraform.tfstate`. For team collaboration, configure a remote backend using OCI Object Storage:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket   = "terraform-state"
    key      = "dbot-tracking/terraform.tfstate"
    region   = "ap-singapore-1"
    endpoint = "https://<namespace>.compat.objectstorage.ap-singapore-1.oraclecloud.com"

    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    force_path_style            = true
  }
}
```

See [OCI Terraform Remote State docs](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/terraformUsingObjectStore.htm) for details.
