# =============================================================================
# Compute Module Variables
# =============================================================================

variable "compartment_id" {
  description = "OCID of the compartment"
  type        = string
}

variable "tenancy_id" {
  description = "OCID of the tenancy"
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key string for instance access"
  type        = string
}

variable "instance_shape" {
  description = "Compute shape"
  type        = string
}

variable "instance_ocpus" {
  description = "OCPU count"
  type        = number
}

variable "instance_memory_in_gbs" {
  description = "Memory in GB"
  type        = number
}

variable "boot_volume_size" {
  description = "Boot volume size in GB"
  type        = number
}

variable "cloud_init_script" {
  description = "Cloud-init script content (YAML string)"
  type        = string
}

variable "vcn_cidr" {
  description = "VCN CIDR block"
  type        = string
}

variable "subnet_cidr" {
  description = "Subnet CIDR block"
  type        = string
}

variable "project_tag" {
  description = "Project tag value"
  type        = string
}
