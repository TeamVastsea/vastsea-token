<script lang="ts" setup>
import RoleSelect from '@/components/role-select.vue';
import { useAccount } from '@/composables/useAccount';
import { TinyForm, TinyFormItem, TinyInput } from '@opentiny/vue';
import { useTemplateRef } from 'vue';

const { formData, formRules, createAccount } = useAccount();

const form = useTemplateRef<any>('form');
</script>

<template>
  <tiny-form
    ref="form"
    label-position="top"
    :model="formData"
    :rules="formRules"
  >
    <tiny-form-item prop="email" label="邮箱">
      <tiny-input v-model="formData.email" />
    </tiny-form-item>
    <tiny-form-item prop="password" label="密码">
      <tiny-input v-model="formData.password" type="password" />
    </tiny-form-item>
    <tiny-form-item prop="profile.nick" label="昵称">
      <tiny-input v-model="formData.profile.nick" />
    </tiny-form-item>
    <tiny-form-item prop="profile.desc" label="简介">
      <tiny-input v-model="formData.profile.desc" />
    </tiny-form-item>
    <tiny-form-item prop="profile.role" label="角色">
      <role-select v-model="formData.role" />
    </tiny-form-item>
    <tiny-form-item>
      <tiny-button type="primary" @click="createAccount(form.validate)">
        提交
      </tiny-button>
    </tiny-form-item>
  </tiny-form>
</template>
