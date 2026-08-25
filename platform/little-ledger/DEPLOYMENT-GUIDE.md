# 小账本部署与维护说明

## 结构

- GitHub 保存代码和说明文档。
- Render 运行 `platform/little-ledger` 的 Docker Web Service，提供网页和 Node API。
- Supabase 保存 `ledger_users` 和 `ledger_records`。账户分类保存在 `ledger_users.categories`，所以每个用户名有自己的分类列表。

## 首次配置

1. 在 GitHub 仓库中确认项目位于 `platform/little-ledger`。
2. Render 新建 Web Service，连接 GitHub 仓库，分支选 `main`，Root Directory 填 `platform/little-ledger`，Runtime 选 Docker，实例可选 Free；不需要 Persistent Disk，因为正式数据放在 Supabase。
3. 在 Supabase 新建项目，打开 SQL Editor，完整运行本目录的 `supabase-schema.sql`。
4. Supabase 的 Project Settings -> API 中复制 Project URL 和服务端密钥。服务端密钥只放 Render，不要提交到 GitHub、网页代码或截图中。
5. 在 Render 的 Environment Variables 添加：

   - `SUPABASE_URL`：Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`：Supabase 服务端密钥

6. 保存后等待 Render 自动部署。访问 `https://你的服务.onrender.com/api/health`，返回 `ok: true` 且 `storage: "supabase"` 才表示云端连接成功。

## 已有项目升级分类功能

如果表已经建过，不需要删表；在 Supabase SQL Editor 单独运行下面的迁移语句：

```sql
alter table public.ledger_users
  add column if not exists categories jsonb not null default '["娱乐","吃喝","房租","衣服","日常","交通","医疗","学习","其他"]'::jsonb;
```

网页中的“管理分类”只修改当前登录用户名。改名会同步该账户历史账目的分类；其他账户和默认分类不受影响。

## 更新发布

代码更新后提交并推送到 GitHub `main`，Render 通常会自动开始新部署；也可以在 Render 服务页选择 Manual Deploy -> Deploy latest commit。部署完成后刷新网页并再次检查 `/api/health`。

## Supabase 数据清理

先在 Supabase Table Editor 导出需要保留的数据。以下命令在 SQL Editor 执行，删除操作不可恢复：

```sql
-- 查看数量
select count(*) from public.ledger_users;
select count(*) from public.ledger_records;

-- 只清空某个账户的账目，保留账户和密码
delete from public.ledger_records where username = '你的用户名';

-- 删除某个账户及其账目（外键 on delete cascade）
delete from public.ledger_users where username = '你的用户名';

-- 清空所有账目，但保留所有账户
truncate table public.ledger_records;

-- 整个项目重新开始：账户和账目都会删除
truncate table public.ledger_records, public.ledger_users;
```

免费计划的空间不足时，优先删除测试账户和测试账目，不要删除表结构。删除后重新打开 `/api/health` 检查服务，网页刷新即可重新登录或注册。

## 手机使用

手机直接打开 Render HTTPS 地址即可。Android Chrome/Edge 可添加到主屏幕，并在相册或支付应用中分享截图到小账本；iPhone 可添加到主屏幕，或通过快捷指令打开网页。网页内的“连续拍照”和“批量截图”只把图片暂存在本次浏览器会话中，识别后不会写入手机相册；选择截图时可以逐张裁剪；只有确认后的结构化账目会保存到 Supabase。

识别结果不是最终账目：系统会过滤地址、电话、日期和票号等常见非消费行，并显示可编辑草稿。提交前可以改金额、中文备注、分类、原始货币，或删除误识别的行；原文会保留在备注中。日文/日元符号会自动将原始货币设为 JPY。
