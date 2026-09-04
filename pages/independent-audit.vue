<template>
  <div class="mx-auto max-w-7xl p-4 sm:p-6">
    <IndependentAuditPanel :api-base="apiBase" :auth-headers="authHeaders" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

useHead({ title: "Independent Audit" });

const { requireAdmin, authHeaders, apiBase } = useAdminAuth();

onMounted(() => {
  requireAdmin("/independent-audit");
});
</script>
