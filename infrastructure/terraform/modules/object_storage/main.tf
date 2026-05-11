# =============================================================================
# Object Storage Module — Backup Bucket
# =============================================================================

data "oci_objectstorage_namespace" "ns" {
  compartment_id = var.compartment_id
}

resource "oci_objectstorage_bucket" "backups" {
  compartment_id = var.compartment_id
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  name           = var.bucket_name
  storage_tier   = var.bucket_storage_tier
  access_type    = "NoPublicAccess"

  freeform_tags = {
    project = var.project_tag
  }
}
