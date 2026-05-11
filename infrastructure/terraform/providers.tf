# =============================================================================
# OCI Provider Configuration
# =============================================================================
# Credentials are read from ~/.oci/config (default profile) or environment vars.
# See docs/deploy/terraform.md for setup instructions.
# =============================================================================

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}
