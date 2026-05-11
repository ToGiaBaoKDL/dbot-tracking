# =============================================================================
# Compute Module Outputs
# =============================================================================

output "public_ip" {
  description = "Public IP of the instance"
  value       = oci_core_instance.main.public_ip
}

output "instance_ocid" {
  description = "OCID of the instance"
  value       = oci_core_instance.main.id
}

output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.main.id
}

output "subnet_id" {
  description = "OCID of the public subnet"
  value       = oci_core_subnet.public.id
}

output "availability_domain" {
  description = "Availability domain used"
  value       = oci_core_instance.main.availability_domain
}
