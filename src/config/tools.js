export const toolCategories = [
  {
    id: 'data-convert',
    name: '数据格式与转换',
    icon: 'el-icon-s-operation',
    description: '结构化数据、编码和常用单位转换。',
    tools: [
      {
        name: 'JSON 编辑器',
        path: '/tool/json',
        icon: 'el-icon-document',
        description: '格式化、压缩并检查 JSON 数据结构。',
        tags: ['json', 'format', 'editor']
      },
      {
        name: 'JSON Schema生成器',
        path: '/tool/json-schema',
        icon: 'el-icon-s-operation',
        description: '根据 JSON 数据递归推断类型、必填字段、枚举和数字范围。',
        tags: ['json', 'schema', 'infer', 'validation']
      },
      {
        name: 'CSV/JSON转换',
        path: '/tool/csv-json',
        icon: 'el-icon-s-operation',
        description: 'CSV 与 JSON 双向转换，支持分隔符、字段选择和嵌套对象扁平化。',
        tags: ['csv', 'json', 'convert', 'export']
      },
      {
        name: 'XML/JSON转换',
        path: '/tool/xml-json',
        icon: 'el-icon-tickets',
        description: 'XML 与 JSON 双向转换，保留属性、文本节点并支持缩进格式化。',
        tags: ['xml', 'json', 'convert', 'format']
      },
      {
        name: 'Base64 编解码',
        path: '/tool/base64',
        icon: 'el-icon-connection',
        description: '进行 Base64 文本编码与解码。',
        tags: ['base64', 'encode', 'decode']
      },
      {
        name: 'URL 编解码',
        path: '/tool/url',
        icon: 'el-icon-link',
        description: '处理 URL encode、decode 与查询参数文本。',
        tags: ['url', 'encode', 'decode']
      },
      {
        name: '进制转换器',
        path: '/tool/base-converter',
        icon: 'el-icon-set-up',
        description: '二进制、八进制、十进制、十六进制互转，支持 ASCII Hex。',
        tags: ['binary', 'octal', 'decimal', 'hex', 'ascii']
      },
      {
        name: '单位换算',
        path: '/tool/unit-converter',
        icon: 'el-icon-set-up',
        description: '常用长度、重量、温度、面积、体积和存储单位实时换算。',
        tags: ['unit', 'convert', 'length', 'weight', 'temperature']
      },
      {
        name: 'ASCII码表',
        path: '/tool/ascii-table',
        icon: 'el-icon-grid',
        description: '查询 ASCII 和扩展 ASCII 表，支持字符互转、转义序列和 CSV 复制。',
        tags: ['ascii', 'code', 'hex', 'binary', 'escape']
      }
    ]
  },
  {
    id: 'text-doc',
    name: '文本处理与文档',
    icon: 'el-icon-edit-outline',
    description: '文本整理、差异对比、正则和 Markdown 编辑。',
    tools: [
      {
        name: 'Markdown编辑器',
        path: '/tool/markdown',
        icon: 'el-icon-edit-outline',
        description: '实时编辑和预览 Markdown，支持代码高亮、图片上传和导出。',
        tags: ['markdown', 'editor', 'preview', 'html']
      },
      {
        name: '文本差异对比',
        path: '/tool/text-diff',
        icon: 'el-icon-document-copy',
        description: '对比两段文本或代码，查看新增、删除和修改内容。',
        tags: ['diff', 'text', 'compare', 'code']
      },
      {
        name: '大小写转换',
        path: '/tool/string-case',
        icon: 'el-icon-edit',
        description: '批量转换大小写、驼峰、帕斯卡、蛇形、短横线和常量命名。',
        tags: ['string', 'case', 'camel', 'snake', 'kebab']
      },
      {
        name: '文本去重排序',
        path: '/tool/text-deduplicator',
        icon: 'el-icon-sort',
        description: '按行去重、排序、过滤和统计重复次数，支持正则过滤。',
        tags: ['text', 'deduplicate', 'sort', 'filter', 'regex']
      },
      {
        name: '正则测试器',
        path: '/tool/regex',
        icon: 'el-icon-search',
        description: '测试正则表达式并查看匹配结果。',
        tags: ['regex', 'regexp', 'test']
      },
      {
        name: '正则速查手册',
        path: '/tool/regex-reference',
        icon: 'el-icon-notebook-2',
        description: '查看正则语法、常用模式，并用在线测试器实时匹配。',
        tags: ['regex', 'reference', 'cheatsheet', 'test']
      }
    ]
  },
  {
    id: 'api-network',
    name: '接口网络与排查',
    icon: 'el-icon-s-promotion',
    description: 'HTTP、鉴权、网络信息和后端常用辅助工具。',
    tools: [
      {
        name: 'HTTP请求工具',
        path: '/tool/http-client',
        icon: 'el-icon-s-promotion',
        description: '类似 Postman 的轻量级 HTTP 客户端，支持历史、收藏和导入导出。',
        tags: ['http', 'api', 'request', 'postman', 'fetch']
      },
      {
        name: 'JWT解析器',
        path: '/tool/jwt',
        icon: 'el-icon-key',
        description: '解析 JWT Header、Payload、Signature，并支持可选签名验证。',
        tags: ['jwt', 'token', 'auth', 'signature']
      },
      {
        name: 'IP归属地查询',
        path: '/tool/ip-lookup',
        icon: 'el-icon-location-outline',
        description: '查询 IPv4 / IPv6 的归属地、运营商、ASN 和经纬度，支持批量与导出。',
        tags: ['ip', 'lookup', 'geo', 'asn', 'isp']
      },
      {
        name: 'UA解析器',
        path: '/tool/user-agent',
        icon: 'el-icon-s-platform',
        description: '解析 User-Agent 的浏览器、系统、设备、渲染引擎和 CPU 架构，支持对比。',
        tags: ['user-agent', 'ua', 'browser', 'device', 'parser']
      },
      {
        name: '身份证解析',
        path: '/tool/id-card',
        icon: 'el-icon-postcard',
        description: '验证中国居民身份证号码，解析地区码、出生日期、年龄、性别和校验码。纯前端完成，不保存数据。',
        tags: ['id-card', 'identity', 'checksum', 'validation', 'china']
      },
      {
        name: 'SQL格式化',
        path: '/tool/sql',
        icon: 'el-icon-s-data',
        description: '格式化、压缩并高亮展示常见 SQL 方言语句。',
        tags: ['sql', 'format', 'database']
      },
      {
        name: 'Cron表达式生成器',
        path: '/tool/cron',
        icon: 'el-icon-alarm-clock',
        description: '可视化生成 Cron 表达式并预览后续执行时间。',
        tags: ['cron', 'schedule', 'task']
      }
    ]
  },
  {
    id: 'security-generate',
    name: '安全与生成',
    icon: 'el-icon-lock',
    description: '哈希、密码、随机数据和代码保护。',
    tools: [
      {
        name: 'Hash生成器',
        path: '/tool/hash',
        icon: 'el-icon-coin',
        description: '生成文本和文件的 MD5、SHA 系列哈希，支持批量、拖拽上传和对比检测。',
        tags: ['hash', 'md5', 'sha1', 'sha256', 'sha512']
      },
      {
        name: '密码生成器',
        path: '/tool/password',
        icon: 'el-icon-key',
        description: '随机生成强密码或可记忆密码，支持批量生成、强度提示和本地历史记录。',
        tags: ['password', 'random', 'security', 'generator']
      },
      {
        name: '随机生成器',
        path: '/tool/random',
        icon: 'el-icon-magic-stick',
        description: '批量生成随机数、字符串、UUID、颜色和密码，支持不重复与种子随机。',
        tags: ['random', 'uuid', 'password', 'string', 'seed']
      },
      {
        name: 'JS代码混淆',
        path: '/tool/code-obfuscator',
        icon: 'el-icon-lock',
        description: '混淆 JavaScript 代码，支持压缩、变量重命名和字符串加密。',
        tags: ['javascript', 'obfuscator', 'minify', 'encrypt']
      }
    ]
  },
  {
    id: 'frontend-media',
    name: '前端样式与媒体',
    icon: 'el-icon-brush',
    description: '样式生成、颜色、图片和二维码处理。',
    tools: [
      {
        name: 'CSS渐变生成器',
        path: '/tool/css-gradient',
        icon: 'el-icon-brush',
        description: '可视化编辑线性和径向渐变，管理颜色停靠点并生成 CSS。',
        tags: ['css', 'gradient', 'color', 'linear', 'radial']
      },
      {
        name: 'CSS阴影生成器',
        path: '/tool/css-shadow',
        icon: 'el-icon-sunny',
        description: '可视化生成 box-shadow 和 text-shadow，支持多重阴影层。',
        tags: ['css', 'shadow', 'box-shadow', 'text-shadow']
      },
      {
        name: '颜色调色板',
        path: '/tool/color-palette',
        icon: 'el-icon-collection-tag',
        description: '选择主色生成互补、类似、三等分和四等分配色，并支持图片取色。',
        tags: ['color', 'palette', 'contrast', 'image', 'css']
      },
      {
        name: '图片压缩',
        path: '/tool/image-compressor',
        icon: 'el-icon-picture-outline',
        description: '本地压缩 JPEG、PNG、WebP 图片，支持批量处理和前后对比。',
        tags: ['image', 'compress', 'jpeg', 'png', 'webp']
      },
      {
        name: '二维码生成器',
        path: '/tool/qrcode',
        icon: 'el-icon-full-screen',
        description: '生成可下载二维码，并支持上传图片解析二维码内容。',
        tags: ['qrcode', 'qr', 'decode', 'encode']
      }
    ]
  },
  {
    id: 'time-efficiency',
    name: '时间效率与记录',
    icon: 'el-icon-date',
    description: '时间日期计算、计时和本地记录。',
    tools: [
      {
        name: '时间戳转换',
        path: '/tool/timestamp',
        icon: 'el-icon-time',
        description: '在 Unix 时间戳与可读日期之间快速转换。',
        tags: ['time', 'timestamp', 'date']
      },
      {
        name: '日期计算器',
        path: '/tool/date-calculator',
        icon: 'el-icon-date',
        description: '计算日期差、工作日差，以及按天、周、月进行日期加减。',
        tags: ['date', 'dayjs', 'calendar', 'workday']
      },
      {
        name: '计时器',
        path: '/tool/timer',
        icon: 'el-icon-timer',
        description: '倒计时和秒表工具，支持计次、提示音、进度条和页面刷新后恢复。',
        tags: ['timer', 'countdown', 'stopwatch', 'lap']
      },
      {
        name: '便签板',
        path: '/tool/sticky-notes',
        icon: 'el-icon-notebook-1',
        description: '本地保存的便签卡片，支持拖拽排序、搜索、导入导出和 Markdown 预览。',
        tags: ['notes', 'sticky', 'markdown', 'localStorage']
      }
    ]
  }
]

export const tools = toolCategories.reduce((result, category) => {
  return result.concat(category.tools.map(tool => ({
    ...tool,
    categoryId: category.id,
    categoryName: category.name
  })))
}, [])
