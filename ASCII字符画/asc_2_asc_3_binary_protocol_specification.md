# ASC 二进制协议规范

本规范定义两种 ASCII 图像/动画编码格式：

- **ASC2**：动态图像（GIF / 视频），基于全局调色板 + 帧差分编码
- **ASC3**：静态图像，真彩色，基于 RLE / RAW 指令流

本规范面向 **编码器与解码器实现者**，以“零歧义、可复现”为目标。

---

## 一、通用约定（General Conventions）

- **字节序**：Little Endian（小端）
- **字符集**：ASCII（1 字节）
- **网格顺序**：
  - 行优先（Row-major）
  - 从左到右，从上到下
  - 索引 0 表示左上角网格

- **网格定义**：
  - 一个“网格”对应一个 ASCII 字符单元
  - 网格数量 = CharWidth × CharHeight

---

## 二、ASC2：动态图像协议

### 2.1 文件结构总览

```
[Header]
[Palette]
[Frame 0]
[Frame 1]
...
[Frame N-1]
```

---

### 2.2 Header（固定长度 21 字节）

| 偏移 | 字段名        | 类型      | 大小 | 说明 |
|-----|---------------|-----------|------|------|
| 0x00 | Magic         | char[4]   | 4    | 固定为 "ASC2" |
| 0x04 | Block Size    | uint8     | 1    | 缩放比例（像素 → 字符） |
| 0x05 | Width         | uint32    | 4    | 原始图像宽度（像素） |
| 0x09 | Height        | uint32    | 4    | 原始图像高度（像素） |
| 0x0D | FPS           | float32   | 4    | 帧率 |
| 0x11 | Frame Count   | uint32    | 4    | 总帧数 |

> **字符网格尺寸计算规则**：
>
> ```
> CharWidth  = max(1, floor(Width  / BlockSize))
> CharHeight = max(1, floor(Height / BlockSize))
> ```

---

### 2.3 Palette（全局调色板）

| 字段 | 类型 | 说明 |
|------|------|------|
| Palette Count | uint16 | 调色板颜色数量 N |
| Color Data | N × 3 bytes | RGBRGB... |

- 每个颜色为 **量化后的 RGB888**
- 实际有效位为高 5 位（RGB555），低 3 位恒为 0

---

### 2.4 Frame 数据结构

每一帧由以下部分组成：

| 字段 | 类型 | 说明 |
|------|------|------|
| Data Size | uint32 | 当前帧指令流字节数 |
| Command Stream | bytes | 帧指令流 |

---

### 2.5 指令流（Command Stream）

指令流由一系列 OpCode 顺序组成，直到填满全部网格。

#### OP_SKIP (0x00)

跳过 N 个网格，保持上一帧内容。

| 字段 | 类型 | 大小 |
|------|------|------|
| Opcode | uint8 | 1 |
| Count | uint16 | 2 |

#### OP_UPDATE (0x01)

更新接下来的 N 个网格。

| 字段 | 类型 | 大小 |
|------|------|------|
| Opcode | uint8 | 1 |
| Count | uint16 | 2 |
| Chars | uint8[N] | N |
| Color Index | uint16[N] | 2N |

---

### 2.6 ASC2 示例字节流（简化）

假设：
- Block Size = 8
- 原始尺寸 = 16 × 8 → 网格 = 2 × 1
- Palette = 2 colors

```
41 53 43 32        # 'ASC2'
08                 # Block Size
10 00 00 00        # Width = 16
08 00 00 00        # Height = 8
00 00 20 41        # FPS = 10.0
01 00 00 00        # Frame Count = 1

02 00              # Palette Count = 2
F8 00 00           # Color 0 (Red)
00 F8 00           # Color 1 (Green)

0B 00 00 00        # Frame Data Size = 11
01 02 00           # OP_UPDATE, Count = 2
41 42              # 'A', 'B'
00 00 01 00        # Color indices
```

---

## 三、ASC3：静态图像协议

### 3.1 文件结构

```
[Header]
[Body (Command Stream)]
```

---

### 3.2 Header（固定长度 13 字节）

| 偏移 | 字段 | 类型 | 大小 | 说明 |
|-----|------|------|------|------|
| 0x00 | Magic | char[4] | 4 | 固定为 "ASC3" |
| 0x04 | Block Size | uint8 | 1 | 缩放比例 |
| 0x05 | Width | uint32 | 4 | 原始图像宽度 |
| 0x09 | Height | uint32 | 4 | 原始图像高度 |

字符网格尺寸计算规则同 ASC2。

---

### 3.3 Body（指令流）

ASC3 不支持 OP_SKIP，仅包含以下两种指令。

#### OP_RLE (0x00)

用于压缩连续重复网格。

| 字段 | 类型 | 大小 |
|------|------|------|
| Opcode | uint8 | 1 |
| Count | uint16 | 2 |
| Char | uint8 | 1 |
| Color | uint8[3] | 3 |

- 总大小：7 字节
- 通常在 Count ≥ 2 时使用

---

#### OP_RAW (0x01)

用于存储不重复的网格。

| 字段 | 类型 | 大小 |
|------|------|------|
| Opcode | uint8 | 1 |
| Count | uint16 | 2 |
| Pixels | N × 4 bytes | Char + RGB |

---

### 3.4 ASC3 示例字节流（简化）

假设：
- Block Size = 8
- 原始尺寸 = 16 × 8 → 网格 = 2 × 1

```
41 53 43 33        # 'ASC3'
08                 # Block Size
10 00 00 00        # Width = 16
08 00 00 00        # Height = 8

01 02 00           # OP_RAW, Count = 2
41 FF 00 00        # 'A', Red
42 00 FF 00        # 'B', Green
```

---

## 四、兼容性与实现注意事项

- 解码器必须严格按 Block Size 计算字符网格尺寸
- 指令流必须完全填满 CharWidth × CharHeight
- ASC2 的第一帧等价于“全 UPDATE 帧”
- 建议解码器在调试模式下验证网格计数一致性

---

**本规范版本：1.0**

