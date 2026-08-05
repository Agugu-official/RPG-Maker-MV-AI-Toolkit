# RPG Maker MCP

**面向 RPG Maker MV/MZ 的 Model Context Protocol（MCP）服务**。它允许任何兼容 MCP 的 AI 助手（例如 Claude、GPT 等）直接读取和写入游戏项目，并在游戏运行时控制游戏状态。

> [English README](README.md) · [Español](README.md#español)

---

## 项目简介

RPG Maker MCP 将 RPG Maker MV/MZ 项目暴露为一组 AI 可以调用的工具。你只需要用自然语言描述需求，AI 就可以代替手工编辑 JSON，完成项目数据的读取和修改，并自动创建备份、执行校验以及记录变更日志。

服务还提供一个**运行时控制桥接**：在游戏中安装一次轻量级调试插件后，AI 可以在游戏实际运行时读取游戏状态、切换开关、设置变量、传送玩家、修改队伍，或触发战斗。

### MV/MZ 兼容性

服务同时支持 RPG Maker MV 和 RPG Maker MZ。启动时会根据官方运行时标记文件自动识别引擎：

- MV：`js/rpg_core.js` 和 `js/rpg_managers.js`
- MZ：`js/rmmz_core.js` 和 `js/rmmz_managers.js`

如需显式指定，可设置 `RPGMAKER_ENGINE=auto|mv|mz`。

数据库、地图、图块集、插件注册表、备份和变更日志等公共层同时支持两个引擎。事件命令、插件模板、系统字段和动画字段会按检测到的原生格式写入；第三方插件源码以及 MV/MZ 动画格式不会自动互相转换。

## 环境要求

| 要求 | 版本 |
|---|---|
| Node.js | 20 或更高版本 |
| RPG Maker | RPG Maker MV 或 MZ，且已有项目 |

TypeScript 仅在开发时需要；编译后的服务使用普通 Node.js 运行。

## 安装

```bash
git clone https://github.com/Zagos/RPG-Maker-AI-Toolkit.git
cd RPG-Maker-AI-Toolkit
npm install
npm run build
```

## 配置

复制 `.env.example` 为 `.env`，然后填写 RPG Maker 项目路径：

```env
# 必填：RPG Maker MV/MZ 项目根目录的绝对路径
RPGMAKER_PROJECT_PATH=C:\Users\you\Documents\MyGame
RPGMAKER_ENGINE=auto             # auto | mv | mz

# 可选：RPG Maker MV/MZ 可执行文件路径，用于 launch-game 工具
RPGMAKER_EXECUTABLE_PATH=C:\Program Files\RPG Maker MZ\RPGMakerMZ.exe
# 可执行文件必须与项目使用的引擎一致。
RPGMAKER_BRIDGE_PORT=9001        # 可选；服务端和调试插件必须保持一致

# 可选
MCP_DEBUG=false
LOG_LEVEL=info                   # debug | info | warn | error
BACKUP_MAX_COUNT=10              # 每个 JSON 文件保留的备份数量
```

`RPGMAKER_PROJECT_PATH` 必须指向包含 `data/` 目录的 RPG Maker 项目根目录。`RPGMAKER_ENGINE=auto` 会检查 MV/MZ 的官方运行时文件；只有在处理裁剪过的项目或测试夹具时，才建议使用 `mv` 或 `mz` 强制指定。

## 运行

```bash
# 开发模式：文件保存后自动重新加载
npm run dev

# 生产模式
npm run build
npm start
```

服务启动后，控制台会输出类似 `✓ RPG Maker project found at: …` 的项目发现信息。

## 连接 Claude Desktop

将以下配置加入 `claude_desktop_config.json`，并替换为本机路径：

```json
{
  "mcpServers": {
    "rpgmaker": {
      "command": "node",
      "args": ["C:/path/to/RPG-Maker-AI-Toolkit/dist/index.js"],
      "env": {
        "RPGMAKER_PROJECT_PATH": "C:/path/to/MyGame",
        "RPGMAKER_ENGINE": "auto"
      }
    }
  }
}
```

## 连接 Codex

本服务通过 `StdioServerTransport` 使用 **STDIO** 传输 MCP。`RPGMAKER_BRIDGE_PORT` 对应的是 `RPGMakerDebugger` 插件使用的本地游戏调试桥接（`/ping`、`/ack`、`/gamestate` 等），不是 MCP HTTP 地址。因此在 Codex 中应注册为 STDIO 服务，不要把该端口作为 `--url` 使用。

Codex CLI、Codex IDE 扩展和 ChatGPT 桌面端共享 MCP 配置。先构建服务，再使用 Codex CLI 注册：

```bash
npm run build

codex mcp add rpgmaker \
  --env RPGMAKER_PROJECT_PATH=/absolute/path/to/MyGame \
  --env RPGMAKER_ENGINE=auto \
  --env RPGMAKER_BRIDGE_PORT=9001 \
  -- node /absolute/path/to/RPG-Maker-AI-Toolkit/dist/index.js
```

如果需要使用 `launch-game`，再增加可执行文件路径：

```bash
codex mcp add rpgmaker \
  --env RPGMAKER_PROJECT_PATH=/absolute/path/to/MyGame \
  --env RPGMAKER_ENGINE=auto \
  --env RPGMAKER_EXECUTABLE_PATH=/absolute/path/to/RPGMaker \
  -- node /absolute/path/to/RPG-Maker-AI-Toolkit/dist/index.js
```

Windows PowerShell 使用等价命令：

```powershell
codex mcp add rpgmaker `
  --env "RPGMAKER_PROJECT_PATH=C:\Users\you\Documents\MyGame" `
  --env "RPGMAKER_ENGINE=auto" `
  --env "RPGMAKER_BRIDGE_PORT=9001" `
  -- node "C:\path\to\RPG-Maker-AI-Toolkit\dist\index.js"
```

检查注册结果：

```bash
codex mcp list
codex mcp get rpgmaker
```

也可以直接编辑 `~/.codex/config.toml`：

```toml
[mcp_servers.rpgmaker]
command = "node"
args = ["/absolute/path/to/RPG-Maker-AI-Toolkit/dist/index.js"]
env = {
  RPGMAKER_PROJECT_PATH = "/absolute/path/to/MyGame",
  RPGMAKER_ENGINE = "auto",
  RPGMAKER_BRIDGE_PORT = "9001"
}
```

在 Codex IDE 扩展中，打开 **MCP servers → Add server**，选择 **STDIO**，填写相同的命令、参数和环境变量，然后保存并重启扩展。配置完成后，可在 Codex TUI 中输入 `/mcp` 查看已连接的 MCP 服务。

## 连接 ChatGPT 桌面端

官方 ChatGPT 桌面端支持通过 **STDIO** 连接本地 MCP 服务，并与 Codex CLI、Codex IDE 扩展共享 MCP 配置。这是直接在 ChatGPT 应用中使用本项目最简单的方式。

1. 先构建服务，让应用启动编译后的入口文件：

   ```bash
   npm run build
   ```

2. 打开 **ChatGPT → Settings → MCP servers → Add server**。

3. 填写以下内容。将占位路径替换为绝对路径；项目路径必须包含 RPG Maker 项目的 `data/` 目录。

   ```text
   Name: rpgmaker
   Transport: STDIO
   Command: node
   Arguments: /absolute/path/to/RPG-Maker-AI-Toolkit/dist/index.js

   Environment:
     RPGMAKER_PROJECT_PATH=/absolute/path/to/MyGame
     RPGMAKER_ENGINE=auto
     RPGMAKER_BRIDGE_PORT=9001
   ```

   只有在需要使用 `launch-game` 工具时，才添加 `RPGMAKER_EXECUTABLE_PATH=/absolute/path/to/RPGMaker`。

4. 保存服务，并在 MCP servers 设置中选择 **Restart**。

5. 在新的 ChatGPT 对话中输入 `/mcp`，确认 `rpgmaker` 已启用。建议先使用只读请求测试，例如：`Run health-check and list the maps in my project.`

应用会自行启动配置好的 STDIO 命令，因此不需要额外保持 `npm run dev` 或 `pnpm run dev` 进程运行。RPG Maker 游戏使用生成的 `RPGMakerDebugger` 插件时，仍然需要配置 `RPGMAKER_BRIDGE_PORT`；但这个端口不是 MCP 服务地址。

## 连接 ChatGPT 网页端或 Work

ChatGPT 网页端不会读取本机 Codex 配置文件，也不能通过输入 shell 命令直接连接本地 STDIO 进程。官方托管版 ChatGPT 接入流程如下：

1. 让 MCP 服务通过公共 HTTPS **Streamable HTTP** 端点访问，通常以 `/mcp` 结尾；或者使用 **Secure MCP Tunnel** 连接私有服务。本仓库当前没有实现远程 Streamable HTTP MCP 端点。

2. 在 ChatGPT 中打开 **Settings → Security and login**，开启 **Developer mode**。该功能是否可用取决于账号或工作区策略。

3. 打开 [ChatGPT Plugins](https://chatgpt.com/plugins)，点击 **+**，填写面向用户的名称和描述；在 **Connection** 中填入包含 `/mcp` 的 HTTPS MCP 地址。使用私有隧道时，选择 **Tunnel**，再选择或填写 `tunnel_id`。

4. 创建连接并检查发现的工具，然后新建 Work 对话，从工具菜单添加该 MCP 连接。建议先使用只读请求（例如 `Run health-check`）验证，再调用编辑工具。

5. 如果修改了工具名称、描述、Schema 或注解，先部署/重启服务，再在 ChatGPT Plugins 中选择 **Refresh**，并新建对话后重新测试。

**重要：** `RPGMAKER_BRIDGE_PORT=9001` 只是 RPG Maker 调试插件使用的本地 HTTP 桥接（`/ping`、`/ack`、`/gamestate` 等路由），不是 MCP HTTP 地址。因此不要把 `http://127.0.0.1:9001` 填入 ChatGPT 的连接 URL。单独运行 `npm run dev` 或 `pnpm run dev` 足够服务本地 STDIO 客户端，但不足以连接 ChatGPT 网页端。

如果需要连接本地私有服务，请参考官方 [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) 文档：创建 tunnel，配置 `tunnel-client` 通过 STDIO 访问本服务，保持 `tunnel-client run` 运行，然后在创建 ChatGPT 开发者模式应用时选择 **Tunnel**。Secure MCP Tunnel 支持私有的开发者模式测试；公开发布插件仍需要稳定的公共 HTTPS 端点。

官方参考：[ChatGPT 与 Codex 中的 MCP](https://learn.chatgpt.com/docs/extend/mcp) · [Quickstart](https://developers.openai.com/plugins/quickstart) · [连接并测试插件](https://developers.openai.com/plugins/deploy/connect-chatgpt) · [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## 项目结构

```text
RPG-Maker-AI-Toolkit/
├── src/
│   ├── index.ts               # 服务入口、工具注册和 HTTP 桥接
│   ├── handlers/              # 按工具组划分的处理器
│   │   ├── registry.ts        # TOOL_HANDLERS 路由表
│   │   ├── debug.ts           # 运行时控制处理器
│   │   ├── actor.ts / item.ts / enemy.ts …
│   │   ├── batch-edit.ts      # 批量调用分发器
│   │   └── types.ts           # HandlerContext 接口
│   ├── rpgmaker/
│   │   ├── reader.ts          # JSON 读取辅助函数
│   │   ├── writer.ts          # JSON 写入、备份和清理
│   │   ├── validator.ts       # 输入校验
│   │   ├── debug-bridge.ts    # 运行时命令、ACK 和游戏状态桥接
│   │   ├── change-log.ts      # mcp-changes.json 变更日志
│   │   ├── commands.ts        # 事件命令构造器
│   │   ├── story-manager.ts
│   │   └── dialogue-manager.ts
│   ├── templates/
│   │   └── plugin-template.ts # RPGMakerDebugger 插件生成器
│   ├── tools/                 # 每个工具的 Zod/JSON Schema 定义
│   └── types/                 # RPG Maker MV/MZ TypeScript 类型
├── tests/                     # Vitest 测试
├── scripts/                   # 启动游戏、安装插件等辅助脚本
├── skills/                    # 项目工作流说明和代理技能
├── EXAMPLES.md                # 工具使用示例
├── .env.example
└── .github/workflows/ci.yml   # Node 20 + 22 矩阵 CI
```

## 可用工具

所有工具都返回 JSON。输入中的 `_id` 字段为可选：省略时创建新实体，提供时更新现有实体。所有写入操作都会先创建备份；成功写入会追加到 `<project>/mcp-changes.json`。

### 数据与系统

| 工具 | 说明 |
|---|---|
| `health-check` | 检查服务是否运行，并返回项目路径和时间戳 |
| `list-game-data` | 按类型列出实体及其名称、ID |
| `list-maps` | 从 `MapInfos.json` 列出地图，并按显示顺序排序 |
| `read-map` | 读取地图元数据、事件列表和遇敌组 |
| `read-entity` | 按类型和 ID 读取单个实体 |
| `list-resources` | 按类别列出 `img/` 和 `audio/` 下的素材文件 |
| `delete-entity` | 在数据库数组中将实体置空；属于带备份的软删除 |
| `get-change-history` | 查询 MCP 写入变更日志 |
| `edit-system` | 修改标题、货币、队伍、初始位置、开关/变量名称、音频和界面文本 |
| `read-system-extended` | 读取 `edit-system` 未覆盖的 terms、vehicles、sounds、basic 等 `System.json` 部分 |

`list-game-data` 的 `data_type` 可取：`Actors`、`Classes`、`Skills`、`Items`、`Weapons`、`Armors`、`Enemies`、`Troops`、`States`、`Animations`、`Tilesets`、`Maps`、`CommonEvents`。

`list-resources` 的 `category` 可取：`characters`、`faces`、`battlers`、`sv_actors`、`tilesets`、`parallaxes`、`pictures`、`bgm`、`bgs`、`se`、`me`、`all`。返回的文件名不含扩展名。给其他工具设置角色图像或音频名称前，建议先调用此工具确认素材存在。

`delete-entity` 需要 `confirm: true`。删除会保留数组索引，已有引用仍会指向空槽位，这与 RPG Maker 编辑器的删除行为一致。

`edit-system` 的字段全部可选，包括 `game_title`、`currency_unit`、`initial_party`、`start_map_id`、`start_x`、`start_y`、`switch_names`、`variable_names`、`title_bgm`、`battle_bgm`、`victory_me`、`defeat_me`、`terms_basic`、`terms_params`、`terms_commands`、`terms_messages` 以及 `opt_autosave`、`opt_display_tp`、`opt_slip_death`、`opt_floor_death`、`opt_follower_distance`、`opt_transparent` 等选项。

`read-system-extended` 的 `section` 可取 `terms`、`vehicles`、`sounds`、`basic`、`all`，默认是 `all`，只读且不会写入项目。

### 角色与敌人

| 工具 | 主要输入 |
|---|---|
| `generate-character` | `name`、`archetype`，以及昵称、等级、头像、行走图、简介等可选字段 |
| `edit-actor` | `actor_id?`、名称、职业、等级、头像、行走图、装备、简介、备注 |
| `edit-enemy` | `enemy_id?`、名称、金币、经验、战斗图、属性、掉落、备注 |
| `edit-enemy-actions` | `enemy_id`、`mode (replace\|append\|clear)`、敌人行动列表 |
| `edit-drop-items` | `enemy_id`、`mode (replace\|append\|clear)`、掉落列表 |

`generate-character` 会读取项目中的职业、武器和防具，并根据关键词为指定原型选择合适的配置。支持的原型为 `warrior`、`mage`、`rogue`、`healer`、`paladin`、`ranger`，并返回 `{ actor_id, class_id, equips, sprite }`。

| 原型 | 偏好职业关键词 | 武器偏好 | 防具偏好 | 默认行走图 |
|---|---|---|---|---|
| `warrior` | warrior、fighter、knight | sword、axe、blade | heavy、plate、mail | Actor1，索引 0 |
| `mage` | mage、wizard、sorcerer | staff、rod、wand | robe、cloth、mystic | Actor2，索引 0 |
| `rogue` | rogue、thief、assassin | dagger、knife、claw | leather、light | Actor3，索引 0 |
| `healer` | healer、cleric、priest | staff、mace、holy | robe、sacred | Actor2，索引 2 |
| `paladin` | paladin、holy knight | sword、lance、blessed | heavy、holy、divine | Actor1，索引 2 |
| `ranger` | ranger、archer、hunter | bow、crossbow、gun | leather、light | Actor3，索引 2 |

`edit-actor` 的 `equips` 是长度为 5 的数组，顺序为 `[weapon_id, shield_id, head_id, body_id, accessory_id]`，使用 `0` 表示空槽位。`face` 和 `character` 是包含 `name` 与 `index` 的嵌套对象。

`edit-enemy` 的属性字段对应 RPG Maker 的 `params[8]` 数组；省略字段时保留原值。`edit-enemy-actions` 的 `rating` 范围为 1–9，`condition_type` 为 0=始终、1=回合 X/Y、2=HP 百分比、3=MP 百分比、4=已施加状态、5=队伍等级、6=开关开启。

`edit-drop-items` 中 `kind` 为 0=无、1=道具、2=武器、3=防具；`denominator` 表示 1/N 的掉落概率，例如 `4` 代表 25%。最多支持 3 个槽位；`append` 会填充第一个空槽位，`clear` 会清空所有槽位。

### 特性与效果

| 工具 | 主要输入 |
|---|---|
| `edit-traits` | `entity_type (Actor\|Class\|Enemy\|Weapon\|Armor\|State)`、`entity_id`、`mode`、`traits [{code, data_id, value}]` |
| `edit-effects` | `entity_type (Skill\|Item)`、`entity_id`、`mode`、`effects [{code, data_id, value1, value2}]` |

`edit-traits` 用于结构化编辑被动特性。`replace` 覆盖数组，`append` 按 `code` + `data_id` 合并更新，`clear` 清空数组。

常见特性代码：

| 代码 | 作用 | 代码 | 作用 |
|---|---|---|---|
| 11 | 元素倍率 | 41 | 添加技能类型 |
| 12 | 弱化倍率 | 42 | 封印技能类型 |
| 13 | 状态倍率 | 43 | 添加技能 |
| 14 | 状态抗性 | 44 | 封印技能 |
| 21 | 参数倍率 | 51 | 可装备武器类型 |
| 22 | Ex 参数（命中/闪避/暴击） | 52 | 可装备防具类型 |
| 23 | Sp 参数（目标率/防御） | 54 | 固定装备槽 |
| 31 | 攻击元素 | 55 | 封印装备槽 |
| 32 | 攻击状态 | 61 | 追加行动 |
| 33 | 攻击速度 | 62 | 特殊标记 |
|  |  | 63 | 下降类型 |
|  |  | 64 | 队伍能力 |

`edit-effects` 用于编辑技能和道具的使用效果。`append` 会追加效果，不执行去重。常见代码包括 11=恢复 HP、12=恢复 MP、13=获得 TP、21=附加状态、22=解除状态、31–34=buff/debuff、41=学习技能、42=调用公共事件、44=获得经验。

### 装备与道具

| 工具 | 主要输入 |
|---|---|
| `edit-item` | `item_id?`、名称、描述、价格、图标、消耗、作用范围、使用场景、效果和备注 |
| `edit-weapon` | `weapon_id?`、名称、武器类型、价格、图标、动画和属性加成 |
| `edit-armor` | `armor_id?`、名称、防具类型、装备槽、价格、图标和属性加成 |

武器和防具支持的属性加成为 `max_hp`、`max_mp`、`attack`、`defense`、`magic_attack`、`magic_defense`、`agility`、`luck`。

`edit-armor` 的 `etype_id` 为 1=武器、2=盾、3=头部、4=身体、5=饰品。`edit-item` 的 `scope` 为 0=无、1=单个敌人、2=所有敌人、3=单个死亡敌人、4=所有死亡敌人、5=单个队友、6=所有队友、7=单个死亡队友、8=所有死亡队友、9=使用者、10=单个濒死队友、11=所有濒死队友；`occasion` 为 0=总是、1=仅战斗、2=仅菜单、3=不可用；`hit_type` 为 0=必中、1=物理、2=魔法。

### 技能、职业与状态

| 工具 | 主要输入 |
|---|---|
| `edit-skill` | `skill_id?`、名称、消耗、作用范围、伤害、动画、命中类型、伤害公式、备注 |
| `edit-class` | `class_id?`、名称、经验曲线、`learnings_mode`、技能学习列表、备注 |
| `edit-state` | `state_id?`、名称、图标、优先级、限制、持续回合、解除条件、描述、备注 |
| `edit-class-learnings` | `class_id`、`mode (replace\|append\|remove_at_level)`、技能学习列表、等级 |

`edit-skill` 对 `damage_formula`、`damage_element_id`、`damage_variance`、`damage_critical` 支持独立更新：工具会先读取现有 `damage` 对象，只修改提供的字段。

`edit-class` 和 `edit-class-learnings` 的 `append` 模式按等级执行 upsert；同等级条目会被替换，每次写入后按等级排序。`remove_at_level` 会删除指定等级的所有学习记录。

### 敌人队伍与战斗事件

| 工具 | 主要输入 |
|---|---|
| `create-troop` | `name`、`members [{enemy_id, x?, y?, hidden?}]` |
| `edit-troop` | `troop_id`、可选 `name` 或完整 `members` |
| `edit-troop-events` | `troop_id`、`mode (replace_all\|append\|clear)`、事件页 |

`create-troop` 会在 `Troops.json` 中创建条目。`members` 必须包含 1–8 个敌人；省略 `x`/`y` 时会自动在战斗画面中排布。`edit-troop-events` 的页面条件支持回合、敌人 HP、角色 HP 和开关；`span` 为 0=每场战斗一次、1=每回合一次、2=每个时机。

战斗事件页可使用以下命令：

| 命令 | 代码 | 关键参数 |
|---|---:|---|
| `change-enemy-hp` | 331 | `enemy_index`、`operation (0=加/1=减/2=乘/3=除/4=取模)`、`operand`、`allow_ko` |
| `change-enemy-mp` | 332 | `enemy_index`、`operation`、`operand` |
| `change-enemy-state` | 333 | `enemy_index`、`action (0=添加/1=移除)`、`state_id` |
| `recover-all-enemies` | 334 | `enemy_index`，`-1` 表示全部 |
| `enemy-appear` | 335 | `enemy_index` |
| `enemy-transform` | 336 | `enemy_index`、`enemy_id` |
| `show-battle-animation` | 337 | `animation_id`、`enemy_index`，`-1` 表示全部 |
| `force-action` | 338 | `subject_type (0=敌人/1=角色)`、`subject_index`、`skill_id`、`target_index` |

### 公共事件

| 工具 | 主要输入 |
|---|---|
| `create-common-event` | `name`、`trigger (0\|1\|2)?`、`switch_id?`、`commands?` |
| `edit-common-event` | `event_id`、可选名称、触发器、开关和命令 |

触发器值为：`0`=无（仅被调用）、`1`=自动运行（开关开启时运行）、`2`=并行（开关开启时循环）。`commands` 使用与 `create-map-event` 相同的 `{ type, data }` 格式。

### 地图与事件

| 工具 | 主要输入 |
|---|---|
| `create-map` | 名称、地图 ID、尺寸、图块集、父地图、滚动、遇敌、背景音乐/环境音等 |
| `edit-map` | `map_id` 以及名称、图块集、滚动、音频、视差、战斗背景和遇敌组等可选字段 |
| `delete-map` | `map_id`、`confirm: true` |
| `create-map-event` | `map_id`、名称、坐标、事件类型、角色图像、页面、对话、奖励和队伍 ID |
| `edit-map-event` | `map_id`、`event_id`、名称、坐标、备注、追加命令 |
| `delete-map-event` | `map_id`、`event_id` |
| `edit-event-page` | `map_id`、`event_id`、`mode (add\|replace\|remove)`、页面索引和页面数据 |
| `add-dialogue` | `dialogue_lines [{speaker?, text}]`、`event_name?` |
| `create-dialogue-advanced` | `dialogue_name`、带选择、条件和动作的分支对话树 |
| `story-generator` | `story_title`、`story_description`、完整的多场景 `scenes` |

`create-map` 会创建空地图并注册到 `MapInfos.json`。省略 `map_id` 时自动分配下一个可用 ID；图块数据初始化为全 0，包含 6 层 × 宽 × 高。

`delete-map` 会先备份，再删除 `MapXXX.json` 并将 `MapInfos.json` 中的条目标记为空，因此需要 `confirm: true`。

`edit-map-event` 可以重命名、移动事件，或在第 0 页终止命令前追加命令。命令格式为 `{ type, data }`，常见类型包括 `message`、`choice`、`wait`、`transfer`、`script`、`switch`、`variable`、`common-event`、`battle`、`animation`、`show-picture`、`tint-picture`、`move-picture`、`rotate-picture`、`erase-picture` 等。

`edit-event-page` 可以新增、替换或删除事件页；至少保留一个页面。页面支持触发方式、优先级、移动、角色图像、开关/变量/独立开关/角色/道具条件以及命令列表。`delete-map-event` 只会将事件数组中的对应槽位置空，不影响周围事件。

`create-map-event` 的事件类型为：`npc`（可行走/交谈角色）、`chest`（带奖励的宝箱）、`enemy`（战斗触发器）、`trigger`（通用脚本触发器）。

### 载具

| 工具 | 主要输入 |
|---|---|
| `edit-vehicle` | `vehicle (boat\|ship\|airship)`、角色图像、BGM、起始地图与坐标 |

该工具编辑 `System.json` 中的船、小船和飞空艇设置。除 `vehicle` 外的字段均可选；修改通常在下次启动游戏或重新加载地图后生效。

### 地图图块绘制

| 工具 | 主要输入 |
|---|---|
| `read-map-tiles` | `map_id`、区域坐标和尺寸、`layers? [0-5]` |
| `paint-map-tiles` | `map_id`、单个图块变更数组 `tiles [{x, y, layer, tile_id}]` |
| `fill-map-region` | `map_id`、矩形区域、层和单个 `tile_id` |
| `paint-map-region` | 单层矩形区域，以及填充用 `tile_id` 或印章用 `tiles` 数组 |

图块索引公式为 `x + y × mapWidth + layer × mapWidth × mapHeight`。第 0–3 层是图块层（0 为空，合法图块 ID 通常不小于 2048），第 4 层是阴影标记（0–15），第 5 层是区域 ID（0–255）。

`read-map-tiles` 用于读取区域内每个格子的图块 ID；`paint-map-tiles` 会将多个单格修改作为一次写入应用，非法条目会跳过并返回警告；`fill-map-region` 会把矩形填充为同一个图块，`tile_id=0` 可清空区域并自动限制在地图边界内。

`paint-map-region` 支持两种模式：`tile_id` 代表整块填充，`tiles` 代表按行排列且长度必须为 `width×height` 的图块印章，适合放置房间模板或地牢预制区域。

### 图块集

| 工具 | 主要输入 |
|---|---|
| `read-tileset` | `tileset_id?`、`include_flags?` |
| `create-tileset` | `name`、`mode?`、9 项 `tilesetNames?` |
| `edit-tileset-properties` | `tileset_id`、名称、模式和 9 项图块集图像引用 |
| `edit-tileset` | `tileset_id`、`flag_overrides [{tile_id, passable?, terrain_tag?}]` |

`read-tileset` 可以读取名称、模式、9 个图像槽位（A1、A2、A3、A4、A5、B、C、D、E）和通行性摘要；设置 `include_flags: true` 时返回完整的 8192 项 flags 数组。省略 `tileset_id` 时列出全部图块集。

`create-tileset` 会在 `Tilesets.json` 中创建条目，8192 个图块标记默认设为可通行。`edit-tileset-properties` 用于修改名称、模式（`0`=World、`1`=Area）和 9 个图像引用；通行性和地形标签使用 `edit-tileset` 修改。`tile_id` 范围为 0–8191，`terrain_tag` 范围为 0–7。

### 插件

插件命令事件数据会根据引擎处理。MV 使用 `raw_command` 保留完整的旧式命令行，或使用 `command_name` 与 `mv_args`；MZ 使用 `plugin_name`、`command_name` 和字符串值的 `args` 对象。服务不会翻译任意第三方插件源码。

| 工具 | 说明 |
|---|---|
| `create-plugin` | 按简单模板创建空插件、钩子、命令或技能修改器插件 |
| `create-plugin-advanced` | 使用带参数、角色、敌人、事件处理器或自定义 UI 模板创建插件 |
| `setup-debug-plugin` | 安装运行时桥接插件，并注册已有插件 |
| `manage-plugins` | 列出、启用、禁用或删除插件 |
| `edit-plugin-parameters` | 部分更新已注册插件的参数 |
| `reorder-plugin` | 将插件移动到首位、末位，或放到另一个插件前/后 |

`setup-debug-plugin` 会向 `js/plugins/` 写入 `RPGMakerDebugger.js`，在 `plugins.js` 中启用它，并把目录中已有的其他 `.js` 文件以禁用状态注册。重复调用不会覆盖已有插件。

`manage-plugins` 的 `delete` 会从注册表移除插件，并在存在时删除对应 `.js` 文件。插件文件名会校验路径分隔符、`<>:"/\\|?*` 和 Windows 保留名称（例如 `CON`、`NUL`、`COM1`）。

RPG Maker MV/MZ 将插件参数存储为字符串；`edit-plugin-parameters` 支持只更新提供的键并保留其他参数。插件加载顺序会影响兼容层和扩展插件，因此 `reorder-plugin` 可用于维护 `js/plugins.js` 的加载顺序。

### 动画

MV 动画保留 `animation1Name`/`animation1Hue`、`animation2Name`/`animation2Hue`、`frames`、`position` 和 `timings`；MZ 动画保留 Effekseer 元数据和 MZ 时间线数组。两种格式不会互相转换。

| 工具 | 主要输入 |
|---|---|
| `read-animation` | `animation_id?` |
| `edit-animation` | `animation_id`、名称、效果名称、显示类型、偏移和速度 |
| `create-animation` | 名称等元数据；帧数据需另行制作 |

`read-animation` 在提供 ID 时返回完整动画对象，否则列出 ID 和名称。`edit-animation` 的 `effect_name` 引用 `effects/` 中的 Effekseer `.efkefc` 文件（不含扩展名）；`display_type` 为 0=目标头部、1=目标中心、2=全屏、-1=屏幕前方。完整帧和时间点编辑不在当前范围内。

### 实体创建

所有 `edit-X` 工具在省略对应 `*_id` 时可以创建实体。以下专用创建工具使用更严格的 Schema，要求名称、提供明确默认值，并立即返回新 ID：

| 工具 | 说明 |
|---|---|
| `create-actor` | 创建带职业、等级、图像、装备和简介的角色 |
| `create-item` | 创建消耗品或关键道具 |
| `create-weapon` | 创建带武器类型和属性加成的武器 |
| `create-armor` | 创建带防具/装备类型和属性加成的防具 |
| `create-skill` | 创建带消耗、范围、伤害和动画的技能 |
| `create-class` | 创建带经验曲线和初始技能学习的职业 |
| `create-state` | 创建带限制、持续时间和解除条件的状态 |
| `create-enemy` | 创建带属性、掉落和战斗行动的敌人 |
| `create-animation` | 创建动画元数据条目，帧数据另行制作 |

创建工具返回 `{ success, <type>_id, name }`。

### 实用工具

| 工具 | 说明 |
|---|---|
| `search-entity` | 按名称执行不区分大小写的子串搜索 |
| `duplicate-entity` | 复制实体并分配新 ID 和名称 |
| `export-project-summary` | 导出角色、敌人、技能、地图、开关和变量的概要 |
| `edit-map-info` | 只修改 `MapInfos.json` 的地图名称、父级、顺序和展开状态 |
| `validate-project` | 批量运行实体校验器并返回错误、警告报告 |
| `find-and-replace` | 在实体名称、备注和事件命令文本中批量查找替换 |
| `copy-map` | 复制地图图块和事件并注册为新地图 |
| `cleanup-project` | 只读检查数据库数组中的空槽位 |
| `batch-update-entities` | 对同类实体批量应用字段更新 |
| `export-dialogue` | 从地图事件和公共事件中导出对话文本 |
| `import-dialogue` | 按导出定位信息写回翻译或修改后的对话 |

需要确认的写入工具会要求 `confirm: true`。`validate-project` 可按 `entity_types` 过滤，并返回 `valid`、总检查数、错误数、警告数以及具体问题。`cleanup-project` 不会重排 ID 或改写文件。

`export-dialogue` 的条目包含 `source_type`、`source_id`、`event_id`、`page`、`command_index`、`speaker` 和 `lines[]`。`import-dialogue` 按这些定位字段匹配，且每个条目的行数必须与原文一致。

### 运行时控制

生成的调试插件会针对检测到的引擎实现命令处理：MV 使用 `Game_Interpreter.prototype.pluginCommand`，MZ 使用 `PluginManager.registerCommand`。运行时查询通过 `XMLHttpRequest` 实现，因此 MV 和 MZ 都可以使用。

这些工具控制**正在运行的游戏**，使用前需要：

1. 在项目上调用一次 `setup-debug-plugin`。
2. 在对应 RPG Maker MV/MZ 的插件管理器中启用该插件。
3. 启动游戏并进入地图（按 Play/F5）。

插件每 500 ms 通过 HTTP 轮询 MCP 服务，命令在收到 ACK 后才会返回。

| 工具 | 说明 |
|---|---|
| `launch-game` | 启动配置的 RPG Maker MV/MZ 可执行文件 |
| `get-game-state` | 读取当前地图、玩家位置、队伍 HP/等级和金币 |
| `get-switch` | 读取开关当前的 ON/OFF 值 |
| `get-variable` | 读取变量当前的数值 |
| `set-switch` | 设置开关值 |
| `set-variable` | 设置变量值 |
| `get-inventory` | 读取队伍道具、武器、防具和金币 |
| `modify-inventory` | 添加或移除道具、武器、防具和金币 |
| `call-common-event` | 按 ID 触发公共事件 |
| `modify-actor-runtime` | 修改运行时角色的等级、经验、HP、MP 或 TP |
| `teleport-player` | 将玩家传送到地图和坐标 |
| `save-game` | 保存到指定槽位，默认槽位为 98 |
| `load-game` | 从指定槽位加载，并等待地图重新加载 |
| `set-party-state` | 设置单个角色或全队的 HP/MP 百分比并增删状态 |
| `start-encounter` | 按队伍 ID 或敌人 ID 触发战斗 |
| `run-battle-suite` | 重复战斗并汇总胜率、平均 HP 和伤害数据 |
| `execute-script` | 在运行中的游戏中执行 JavaScript |
| `show-message` | 在游戏消息窗口显示文本 |
| `get-actor-runtime` | 读取单个角色的等级、HP、装备、技能和状态 |
| `manage-party-runtime` | 读取、添加或移除队伍成员 |
| `control-weather-runtime` | 控制无天气、雨、暴雨或雪 |
| `play-audio-runtime` | 播放或停止 BGM、BGS、SE、ME |
| `get-map-state-runtime` | 读取地图尺寸、玩家位置和当前天气 |
| `control-timer-runtime` | 启动、停止或读取游戏倒计时 |
| `get-battle-state-runtime` | 在战斗中读取回合、敌人和队伍状态 |

运行时工具的常用参数包括：`get-inventory` 的 `category` 为 `items|weapons|armors|all`；`modify-inventory` 的类型为 `item|weapon|armor|gold`；`modify-actor-runtime` 的字段为 `level|exp|hp|mp|tp`，模式为 `set|add`；天气 `power` 范围为 0–9；计时器使用帧数，60 帧约等于 1 秒。

典型流程：

```text
1. setup-debug-plugin       ← 每个项目安装一次
2. launch-game              ← 启动游戏
3. get-game-state           ← 确认连接和初始状态
4. get-switch / get-variable ← 读取场景所需的标记和计数
5. set-switch / set-variable ← 设置测试场景
6. get-inventory            ← 检查测试前的物品
7. modify-inventory         ← 添加测试物品或金币
8. teleport-player          ← 前往目标区域
9. modify-actor-runtime     ← 设置等级、HP 或 TP
10. set-party-state         ← 设置队伍状态
11. call-common-event       ← 需要时触发准备事件
12. start-encounter         ← 执行战斗并获取日志
13. run-battle-suite        ← 重复战斗并进行统计
14. save-game / load-game   ← 保存和恢复复现状态
```

### 备份

| 工具 | 主要输入 |
|---|---|
| `manage-backups` | `action (list\|restore\|delete\|prune)`、文件名、备份名和最大数量 |

每次写入前都会自动在 `<project>/backups/` 创建备份。`BACKUP_MAX_COUNT` 默认为 10，用于控制每个 JSON 文件保留的备份数量。

### 批量操作

| 工具 | 主要输入 |
|---|---|
| `batch-edit` | `operations [{tool, input}]`，最多 50 项，可选 `stop_on_error` |
| `batch-create-entities` | 同类型实体数组，最多 50 项 |
| `batch-delete-entities` | 实体类型、最多 100 个 ID、`confirm: true` |
| `batch-update-entities` | 实体类型、ID 数组、更新对象、`confirm: true` |

`batch-edit` 按顺序执行多个工具调用；除非设置 `stop_on_error: true`，单项失败不会阻止后续操作。

`batch-create-entities` 支持 `Actor`、`Item`、`Weapon`、`Armor`、`Skill`、`Class`、`State`、`Enemy`、`Troop`、`CommonEvent`、`Animation`、`Tileset`，每个对象至少需要 `name`。`batch-delete-entities` 会将多个实体槽位置空，并逐个返回结果。

示例：

```json
{
  "operations": [
    { "tool": "edit-actor", "input": { "actor_id": 1, "name": "Aria" } },
    { "tool": "edit-item", "input": { "name": "Mana Potion", "price": 150 } },
    { "tool": "set-switch", "input": { "id": 5, "value": true } }
  ]
}
```

## 使用示例

你不需要直接编写 JSON，只要用自然语言描述想做的事情，AI 就会调用相应工具。参阅 **[EXAMPLES.md](EXAMPLES.md)** 获取每个工具的自然语言提示和 JSON 参考输入。该文件目前提供英文和西班牙文示例。

## 变更日志

每次成功写入都会向 `<project>/mcp-changes.json` 追加一条记录，可使用 `get-change-history` 查询：

```json
{ "tool": "get-change-history", "input": { "action": "create", "limit": 20 } }
```

日志条目包含：`timestamp`、`tool`、`entityType`、`entityId`、`action`、`summary`。

## 运行测试

```bash
npm test                  # 一次性运行全部测试
npm run test:watch        # 监听模式
npm run test:coverage     # 生成 v8 覆盖率报告
npx tsc --noEmit          # 仅执行类型检查
```

CI 在 Node.js 20 和 22 上执行类型检查、构建和测试。覆盖率配置不包含 `src/index.ts`、`src/tools/**` 和 `src/templates/**`。

## 故障排查

| 错误 | 处理方式 |
|---|---|
| `RPGMAKER_PROJECT_PATH is not set` | 在 `.env` 中设置项目根目录 |
| `RPG Maker project path does not exist` | 检查路径是否存在；Windows 也可使用正斜杠 |
| `RPG Maker data directory not found` | 项目根目录必须包含 `data/` |
| `Invalid plugin filename` | 插件名不能包含 `<>:"/\\|?*` 或路径分隔符 |
| `mapInfo is missing required fields` | 使用 `create-map-event` 的 `mapInfo` 时补齐全部 7 个字段 |
| `Game not connected` | 启动游戏、启用 `RPGMakerDebugger` 插件，并等待地图加载 |
| 运行时工具超时 | 确认游戏已进入地图，且调试插件已启用 |
| 服务挂起 | 使用 `Ctrl+C` 停止，检查项目路径后执行 `npm run dev` 重启 |

## 参与贡献

提交代码前请运行类型检查、构建和测试，并为新的工具补充对应的 Schema、处理器、注册项和 Vitest 测试。详细约定见 [AGENTS.md](AGENTS.md)。

## 许可证

本项目使用 [MIT License](LICENSE)。
