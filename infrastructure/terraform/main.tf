# =============================================================================
# Root Main — Wire Modules
# =============================================================================

module "compute" {
  source = "./modules/compute"

  compartment_id         = var.compartment_ocid
  tenancy_id             = var.tenancy_ocid
  ssh_public_key         = file(pathexpand(var.ssh_public_key_path))
  instance_shape         = var.instance_shape
  instance_ocpus         = var.instance_ocpus
  instance_memory_in_gbs = var.instance_memory_in_gbs
  boot_volume_size       = var.boot_volume_size
  cloud_init_script      = file("${path.module}/../../${var.cloud_init_script_path}")
  vcn_cidr               = var.vcn_cidr
  subnet_cidr            = var.subnet_cidr
  project_tag            = var.project_tag
}

module "object_storage" {
  source = "./modules/object_storage"

  compartment_id        = var.compartment_ocid
  bucket_name           = var.bucket_name
  bucket_storage_tier   = var.bucket_storage_tier
  project_tag           = var.project_tag
}
