# =============================================================================
# Terraform — Oracle Cloud Infrastructure
# =============================================================================
# Manages:
#   - Compute instance (VM.Standard.A1.Flex, 2 OCPU + 12 GB RAM, 100 GB boot)
#   - VCN, public subnet, internet gateway, route table, security list
#   - Object Storage bucket for backups
# =============================================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}
