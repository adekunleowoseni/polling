<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    showName?: boolean;
    size?: "sm" | "md" | "lg";
    nameClass?: string;
  }>(),
  {
    showName: true,
    size: "md",
    nameClass: "text-primary",
  },
);

const markClass = computed(() => {
  if (props.size === "sm") return "h-7 w-7";
  if (props.size === "lg") return "h-10 w-10";
  return "h-8 w-8";
});

const wordClass = computed(() => {
  if (props.size === "sm") return "text-sm";
  if (props.size === "lg") return "text-xl sm:text-2xl";
  return "text-lg sm:text-xl";
});
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-2.5">
    <img
      src="/applogo.png"
      alt="e-mobilize"
      class="shrink-0 rounded-md object-contain"
      :class="markClass"
      width="40"
      height="40"
    />
    <span
      v-if="showName"
      class="truncate font-headline-md font-bold tracking-tight"
      :class="[wordClass, nameClass]"
    >
      e-mobilize
    </span>
  </span>
</template>
