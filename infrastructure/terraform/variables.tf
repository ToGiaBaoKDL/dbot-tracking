# =============================================================================
# Root Variables
# =============================================================================

# ---------------------------------------------------------------------------
# OCI Authentication
# ---------------------------------------------------------------------------
variable "tenancy_ocid" {
  description = "OCID of the OCI tenancy"
  type        = string
}

variable "user_ocid" {
  description = "OCID of the OCI user"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the OCI API key"
  type        = string
}

variable "private_key_path" {
  description = "Path to the OCI API private key file (e.g. ~/.oci/oci_api_key.pem)"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "OCI region identifier (e.g. ap-singapore-1)"
  type        = string
}

# ---------------------------------------------------------------------------
# Compartment
# ---------------------------------------------------------------------------
variable "compartment_ocid" {
  description = "OCID of the compartment to create resources in"
  type        = string
}

# ---------------------------------------------------------------------------
# Compute
# ---------------------------------------------------------------------------
variable "ssh_public_key_path" {
  description = "Path to the SSH public key for instance access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "instance_shape" {
  description = "OCI compute shape"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "Number of OCPUs for the instance"
  type        = number
  default     = 2
}

variable "instance_memory_in_gbs" {
  description = "Memory in GB for the instance"
  type        = number
  default     = 12
}

variable "boot_volume_size" {
  description = "Boot volume size in GB (max 200 in Free Tier)"
  type        = number
  default     = 100
}

variable "cloud_init_script_path" {
  description = "Path to the cloud-init YAML file relative to the project root"
  type        = string
  default     = "scripts/cloud-init.yaml"
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
variable "vcn_cidr" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.0.0/24"
}

# ---------------------------------------------------------------------------
# Object Storage
# ---------------------------------------------------------------------------
variable "bucket_name" {
  description = "Name of the Object Storage bucket for backups"
  type        = string
  default     = "dbot-backups"
}

variable "bucket_storage_tier" {
  description = "Storage tier for the bucket"
  type        = string
  default     = "Standard"
}

# ---------------------------------------------------------------------------
# Tagging
# ---------------------------------------------------------------------------
variable "project_tag" {
  description = "Tag value for project identification"
  type        = string
  default     = "dbot-tracking"
}
