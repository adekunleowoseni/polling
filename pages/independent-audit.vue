<template>
  <IndependentAuditPanel :api-base="apiBase" />
</template>

<script setup lang="ts">
definePageMeta({ layout: "audit" });

useHead({
  title: "Ogun State Independent Audit",
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
  ],
});

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
</script>
