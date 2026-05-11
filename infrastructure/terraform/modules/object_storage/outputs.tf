# =============================================================================
# Object Storage Module Outputs
# =============================================================================

output "bucket_name" {
  description = "Name of the created bucket"
  value       = oci_objectstorage_bucket.backups.name
}

output "namespace" {
  description = "Object Storage namespace"
  value       = data.oci_objectstorage_namespace.ns.namespace
}

output "bucket_id" {
  description = "OCID of the bucket"
  value       = oci_objectstorage_bucket.backups.id
}
