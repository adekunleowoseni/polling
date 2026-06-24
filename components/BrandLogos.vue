<template>
  <div class="flex items-center" :class="[stacked ? 'flex-col gap-2' : 'gap-3', $attrs.class]">
    <img
      src="/logos/ogun.jpg"
      alt="Ogun State Government"
      :class="ogunClass"
    />
    <img
      v-if="showDivider && !stacked"
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='32'%3E%3Cline x1='0' y1='0' x2='0' y2='32' stroke='%2394a3b8' stroke-width='1'/%3E%3C/svg%3E"
      alt=""
      class="h-8 w-px"
      aria-hidden="true"
    />
    <img
      src="/logos/pdp.png"
      alt="Peoples Democratic Party"
      :class="pdpClass"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg";
    stacked?: boolean;
    showDivider?: boolean;
  }>(),
  { size: "md", stacked: false, showDivider: true },
);

const ogunClass = computed(() => {
  const base = "rounded-full object-cover";
  if (props.size === "sm") return `${base} h-8 w-8`;
  if (props.size === "lg") return `${base} h-16 w-16`;
  return `${base} h-10 w-10`;
});

const pdpClass = computed(() => {
  const base = "rounded-full object-contain";
  if (props.size === "sm") return `${base} h-8 w-8`;
  if (props.size === "lg") return `${base} h-14 w-14`;
  return `${base} h-10 w-10`;
});
</script>
