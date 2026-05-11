# =============================================================================
# Object Storage Module Variables
# =============================================================================

variable "compartment_id" {
  description = "OCID of the compartment"
  type        = string
}

variable "bucket_name" {
  description = "Name of the bucket"
  type        = string
}

variable "bucket_storage_tier" {
  description = "Storage tier (Standard or Archive)"
  type        = string
}

variable "project_tag" {
  description = "Project tag value"
  type        = string
}
