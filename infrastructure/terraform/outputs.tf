# =============================================================================
# Root Outputs
# =============================================================================

output "instance_public_ip" {
  description = "Public IP of the compute instance"
  value       = module.compute.public_ip
}

output "instance_ocid" {
  description = "OCID of the compute instance"
  value       = module.compute.instance_ocid
}

output "bucket_name" {
  description = "Name of the created Object Storage bucket"
  value       = module.object_storage.bucket_name
}

output "bucket_namespace" {
  description = "Object Storage namespace (needed for rclone config)"
  value       = module.object_storage.namespace
}

output "bucket_url" {
  description = "Console URL for the bucket"
  value       = "https://cloud.oracle.com/object-storage/buckets/${module.object_storage.namespace}/${var.region}/${module.object_storage.bucket_name}"
}
