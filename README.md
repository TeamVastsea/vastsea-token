# Vastsea Token

## 简介

一站式认证鉴权服务

## 功能

- 第三方客户端管理
  - [ ] 注册第三方客户端
  - [ ] 注销第三方客户端
  - [ ] 修改第三方客户端信息
  - [ ] 获取客户端列表
  - [ ] 获取某个第三方客户端信息
- 账号管理
  - [ ] 登录不同的客户端 (OAuth2, 授权码模式) (尚未测试, 等待客户端API实现)
  - [ ] 停用账号
  - [x] 创建账号 (邮箱验证)
  - [ ] online 接口 (账号是否在线)
  - [ ] 忘记密码
  - [ ] 修改密码
- 角色管理
  - [ ] 角色创建 (客户端级别)
  - [ ] 角色继承
  - [ ] 角色删除
- 权限管理
  - [x] 权限创建
  - [x] 权限删除
  - [x] 权限修改
  - [x] 获取权限列表
  - [x] 获取某个权限信息
  - [ ] 权限绑定
  - [ ] 权限校验 (客户端级别)