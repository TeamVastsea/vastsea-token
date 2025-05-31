<script lang="ts" setup>
import { Link as UiLink } from '@/components/ui';
</script>

<template>
  <div class="p-4 bg-zinc-50 h-screen w-screen overflow-auto dark:bg-zinc-900">
    <div class="group mx-auto flex gap-4 h-full max-w-screen-lg relative">
      <div
        class="group rounded-md bg-zinc-100 flex shrink-0 basis-48 flex-col h-full w-full hidden top-0 sticky z-10 overflow-auto dark:bg-zinc-800 md:block"
      >
        <ul class="my-4 px-2 flex-auto space-y-3">
          <ui-link :to="{ name: 'Profile' }">
            <li class="px-2 flex gap-2 items-center">
              <div class="i-material-symbols:arrow-back-ios-new-rounded text-zinc-800 cursor-pointer dark:text-zinc-200" />
              返回个人主页
            </li>
          </ui-link>
          <ui-link :to="{ name: 'setting::profile' }">
            <li class="p-2">
              个人信息
            </li>
          </ui-link>
          <ui-link :to="{ name: 'setting::secure' }">
            <li class="p-2">
              安全管理
            </li>
          </ui-link>
        </ul>
      </div>
      <div class="pt-4 rounded-md bg-zinc-100 h-full w-full overflow-auto md:pt-0 dark:bg-zinc-800">
        <div class="px-4 flex flex-col gap-4 w-full items-start sm:flex-row md:hidden sm:items-end">
          <ui-link :to="{ name: 'Profile' }">
            个人主页
          </ui-link>
          <ui-link
            :to="{ name: 'setting::profile' }"
            class="text-opacity-80 transition hover:text-opacity-100"
            active-class="bg-transparent! text-zinc-800! dark:text-zinc-100! text-3xl text-opacity-100!"
          >
            个人信息
          </ui-link>
          <ui-link
            :to="{ name: 'setting::secure' }"
            class="text-opacity-80 transition hover:text-opacity-100"
            active-class=" text-opacity-100! bg-transparent! text-zinc-800! dark:text-zinc-100! text-3xl"
          >
            安全管理
          </ui-link>
        </div>
        <div class="h-[calc(100%_-_calc(var(--spacing)_*_16))] w-full md:h-full">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>
