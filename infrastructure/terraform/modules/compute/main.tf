# =============================================================================
# Compute Module — Instance + VCN + Network
# =============================================================================

# ---------------------------------------------------------------------------
# Data Sources
# ---------------------------------------------------------------------------
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_id
}

data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# ---------------------------------------------------------------------------
# VCN
# ---------------------------------------------------------------------------
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "dbot-vcn"
  dns_label      = "dbotvcn"

  freeform_tags = {
    project = var.project_tag
  }
}

# ---------------------------------------------------------------------------
# Internet Gateway
# ---------------------------------------------------------------------------
resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "dbot-internet-gateway"
  enabled        = true

  freeform_tags = {
    project = var.project_tag
  }
}

# ---------------------------------------------------------------------------
# Route Table
# ---------------------------------------------------------------------------
resource "oci_core_default_route_table" "main" {
  manage_default_resource_id = oci_core_vcn.main.default_route_table_id

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }

  freeform_tags = {
    project = var.project_tag
  }
}

# ---------------------------------------------------------------------------
# Security List — ingress 22 only, egress all
# ---------------------------------------------------------------------------
resource "oci_core_default_security_list" "main" {
  manage_default_resource_id = oci_core_vcn.main.default_security_list_id

  # Ingress: SSH only
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = false
    description = "SSH access"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # Egress: all
  egress_security_rules {
    protocol       = "all"
    destination    = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless      = false
    description    = "Allow all outbound traffic"
  }

  freeform_tags = {
    project = var.project_tag
  }
}

# ---------------------------------------------------------------------------
# Public Subnet
# ---------------------------------------------------------------------------
resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = var.subnet_cidr
  display_name      = "dbot-public-subnet"
  dns_label         = "public"
  route_table_id    = oci_core_vcn.main.default_route_table_id
  security_list_ids = [oci_core_vcn.main.default_security_list_id]

  freeform_tags = {
    project = var.project_tag
  }
}

# ---------------------------------------------------------------------------
# Compute Instance
# ---------------------------------------------------------------------------
resource "oci_core_instance" "main" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "dbot-instance"
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_in_gbs
  }

  source_details {
    source_type             = "image"
    image_id                = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_size
    boot_volume_vpus_per_gb = "20"
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(var.cloud_init_script)
  }

  freeform_tags = {
    project = var.project_tag
  }
}

