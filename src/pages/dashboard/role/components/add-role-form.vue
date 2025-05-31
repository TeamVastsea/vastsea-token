<script lang="ts" setup>
import type { CreateRole, MininalRole } from '@/composables';
import ClientSelect from '@/components/client-select.vue';
import { usePermission, useRole } from '@/composables';
import {
  TinyButton,
  TinyForm,
  TinyFormItem,
  TinyInput,
  TinyOption,
  TinySelect,
} from '@opentiny/vue';
import { vElementVisibility } from '@vueuse/components';
import { computed, reactive, ref, useTemplateRef, watch } from 'vue';

const emits = defineEmits<{
  ok: [MininalRole[]];
}>();

const client = ref<{ clientId: string; name: string }[]>([]);

const { getRoleList, roleList, createRole, loadMore: loadMoreRole } = useRole({ type: 'scroll' });

const formData: CreateRole = reactive({
  name: '',
  desc: '',
  clientId: '',
  parent: [],
  permissions: [],
});

const form = useTemplateRef<Form>('form');
const { permissionList, getPermissionList, loadMore } = usePermission({
  type: 'scroll',
  size: 5,
});

const permissionSelect = computed(() => {
  return (
    permissionList.value?.map((permission) => {
      return {
        label: permission.desc ?? permission.name,
        value: permission.id,
      };
    }) ?? []
  );
});
const roleSelect = computed(() => {
  return roleList.value.map((role) => {
    return {
      label: role.desc || role.name,
      value: role.id,
    };
  });
});
const clientId = computed(() => client.value.map(client => client?.clientId));
const batchCreateRole = () => {
  form.value
    .validate()
    .then((ok: boolean) => {
      if (!ok) {
        return;
      }
      const tasks = [];
      for (const id of clientId.value) {
        tasks.push(
          createRole({
            ...formData,
            clientId: id,
          }),
        );
      }
      Promise.allSettled(tasks)
        .then((handles) => {
          return handles.filter(handle => handle.status === 'fulfilled');
        })
        .then((res) => {
          return res.map(res => res.value);
        })
        .then((roles) => {
          emits('ok', roles);
        });
    })
    .catch(() => {});
};
const onBottom = () => {
  if (!clientId.value.length) {
    return;
  }
  loadMore(clientId.value[0]);
};
const onParentButton = () => {
  if (!clientId.value.length) {
    return;
  }
  loadMoreRole(clientId.value[0]);
};
watch(
  clientId,
  () => {
    permissionList.value = [];
    roleList.value = [];
    Promise.all([
      ...clientId.value.map(value =>
        getPermissionList(value, undefined, true),
      ),
      ...clientId.value.map(value =>
        getRoleList({ all: true, clientId: value }),
      ),
    ]).then(() => {
      formData.permissions = formData.permissions.filter(
        (readySubmitPermission) => {
          return permissionList.value
            ?.map(permission => permission.name)
            .includes(readySubmitPermission);
        },
      );
      formData.parent = formData.parent.filter((role) => {
        return roleList.value.map(_role => _role.name).includes(role);
      });
    });
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="w-full">
    <tiny-form ref="form" label-position="top" :model="formData">
      <tiny-form-item label="角色Key" required prop="name">
        <tiny-input v-model="formData.name" />
      </tiny-form-item>
      <tiny-form-item label="角色简介" required prop="desc">
        <tiny-input v-model="formData.desc" />
      </tiny-form-item>
      <tiny-form-item label="目标客户端">
        <client-select v-model="client" />
      </tiny-form-item>
      <tiny-form-item label="权限" required prop="permissions">
        <tiny-select v-model="formData.permissions" multiple>
          <tiny-option
            v-for="(item, key) in permissionSelect"
            :key="key"
            :label="item.label"
            :value="item.value"
          />
          <div v-element-visibility="onBottom" />
        </tiny-select>
      </tiny-form-item>
      <tiny-form-item label="父级角色">
        <tiny-select v-model="formData.parent" multiple>
          <tiny-option
            v-for="(item, key) in roleSelect"
            :key="key"
            :label="item.label"
            :value="item.value"
          />
          <div v-element-visibility="onParentButton" />
        </tiny-select>
      </tiny-form-item>
      <tiny-form-item>
        <tiny-button @click="batchCreateRole">
          提交
        </tiny-button>
      </tiny-form-item>
    </tiny-form>
  </div>
</template>
