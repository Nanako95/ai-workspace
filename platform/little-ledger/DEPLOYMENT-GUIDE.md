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

### 先判断要清理什么

先在 Supabase Table Editor 导出需要保留的数据。以下命令都在 Supabase 的 **SQL Editor** 中执行，删除操作不可恢复；不要删除表本身或 `categories` 字段。

```sql
-- 1. 查看账户和账目数量
select count(*) from public.ledger_users;
select count(*) from public.ledger_records;

-- 2. 查看每个账户各有多少账目，先定位测试账户
select username, count(*) as record_count
from public.ledger_records
group by username
order by record_count desc;
```

### 只清理一个账户

保留账户和密码，只删除该用户的账目：

```sql
delete from public.ledger_records
where username = '你的用户名';
```

如果要连账户一起删除，执行下面这条即可；由于外键设置了 `on delete cascade`，该用户的账目也会一起删除：

```sql
delete from public.ledger_users
where username = '你的用户名';
```

### 清理全部测试账目

保留所有账户，只清空账目表。适合项目测试数据太多的情况：

```sql
truncate table public.ledger_records;
```

### 彻底重置项目

账户、密码、分类和所有账目都会删除。执行后需要重新注册账户：

```sql
truncate table public.ledger_records, public.ledger_users;
```

### 清理后检查

清理后可以执行：

```sql
select count(*) from public.ledger_users;
select count(*) from public.ledger_records;
```

然后打开 `https://你的服务.onrender.com/api/health`，确认返回 `"ok": true` 和 `"storage": "supabase"`。网页刷新后即可继续使用。免费计划空间不足时，优先删除测试账户和测试账目，不要删除表结构。

## 手机使用

手机直接打开 Render HTTPS 地址即可。Android Chrome/Edge 可添加到主屏幕，并在相册或支付应用中分享截图到小账本；iPhone 可添加到主屏幕，或通过快捷指令打开网页。网页内的“连续拍照”和“批量截图”只把图片暂存在本次浏览器会话中，识别后不会写入手机相册；选择截图时可以逐张裁剪，裁剪框可拖动位置并通过四角/四边调整大小；只有确认后的结构化账目会保存到 Supabase。

识别结果不是最终账目：系统会过滤地址、电话、日期和票号等常见非消费行，并显示可编辑草稿。提交前可以改金额、中文备注、分类、原始货币，或删除误识别的行；原文会保留在备注中。日文/日元符号会自动将原始货币设为 JPY。

账目页可以勾选多笔记录，点击“删除选中”后一次删除；系统会再次确认，删除操作不可恢复。

识别草稿中的“智能分类”会根据商品中文、日文、繁体或英文名称重新评分分类；当前账户如果把“吃喝”改名为“餐饮”或“食品”，系统会优先使用该账户现有的对应分类。智能分类仍建议在提交前快速核对。
