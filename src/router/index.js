import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const Home = () => import(/* webpackChunkName: "home" */ '../views/Home.vue')
const JsonEditor = () => import(/* webpackChunkName: "tool-json" */ '../views/tools/JsonEditor.vue')
const Timestamp = () => import(/* webpackChunkName: "tool-timestamp" */ '../views/tools/Timestamp.vue')
const UrlCodec = () => import(/* webpackChunkName: "tool-url" */ '../views/tools/UrlCodec.vue')
const Base64 = () => import(/* webpackChunkName: "tool-base64" */ '../views/tools/Base64.vue')
const RegexTester = () => import(/* webpackChunkName: "tool-regex" */ '../views/tools/RegexTester.vue')
const CronGenerator = () => import(/* webpackChunkName: "tool-cron" */ '../views/tools/CronPlaceholder.vue')
const SqlFormatter = () => import(/* webpackChunkName: "tool-sql" */ '../views/tools/SqlPlaceholder.vue')
const QrcodeTool = () => import(/* webpackChunkName: "tool-qrcode" */ '../views/tools/QrcodePlaceholder.vue')
const TextDiff = () => import(/* webpackChunkName: "tool-text-diff" */ '../views/tools/TextDiff.vue')
const CodeObfuscator = () => import(/* webpackChunkName: "tool-code-obfuscator" */ '../views/tools/CodeObfuscator.vue')
const MarkdownEditor = () => import(/* webpackChunkName: "tool-markdown" */ '../views/tools/MarkdownEditor.vue')
const HttpClient = () => import(/* webpackChunkName: "tool-http-client" */ '../views/tools/HttpClient.vue')
const JwtParser = () => import(/* webpackChunkName: "tool-jwt" */ '../views/tools/JwtParser.vue')
const BaseConverter = () => import(/* webpackChunkName: "tool-base-converter" */ '../views/tools/BaseConverter.vue')
const ImageCompressor = () => import(/* webpackChunkName: "tool-image-compressor" */ '../views/tools/ImageCompressor.vue')
const DateCalculator = () => import(/* webpackChunkName: "tool-date-calculator" */ '../views/tools/DateCalculator.vue')
const JsonSchema = () => import(/* webpackChunkName: "tool-json-schema" */ '../views/tools/JsonSchema.vue')
const StringCaseConverter = () => import(/* webpackChunkName: "tool-string-case" */ '../views/tools/StringCaseConverter.vue')
const TextDeduplicator = () => import(/* webpackChunkName: "tool-text-deduplicator" */ '../views/tools/TextDeduplicator.vue')
const RegexReference = () => import(/* webpackChunkName: "tool-regex-reference" */ '../views/tools/RegexReference.vue')
const CssGradientGenerator = () => import(/* webpackChunkName: "tool-css-gradient" */ '../views/tools/CssGradientGenerator.vue')
const CssBoxShadowGenerator = () => import(/* webpackChunkName: "tool-css-shadow" */ '../views/tools/CssBoxShadowGenerator.vue')
const ColorPalette = () => import(/* webpackChunkName: "tool-color-palette" */ '../views/tools/ColorPalette.vue')
const CsvJsonConverter = () => import(/* webpackChunkName: "tool-csv-json" */ '../views/tools/CsvJsonConverter.vue')
const XmlJsonConverter = () => import(/* webpackChunkName: "tool-xml-json" */ '../views/tools/XmlJsonConverter.vue')
const HashGenerator = () => import(/* webpackChunkName: "tool-hash" */ '../views/tools/HashGenerator.vue')
const PasswordGenerator = () => import(/* webpackChunkName: "tool-password" */ '../views/tools/PasswordGenerator.vue')
const IpLookup = () => import(/* webpackChunkName: "tool-ip-lookup" */ '../views/tools/IpLookup.vue')
const UserAgentParser = () => import(/* webpackChunkName: "tool-user-agent" */ '../views/tools/UserAgentParser.vue')
const IdCardParser = () => import(/* webpackChunkName: "tool-id-card" */ '../views/tools/IdCardParser.vue')
const AsciiTable = () => import(/* webpackChunkName: "tool-ascii-table" */ '../views/tools/AsciiTable.vue')
const RandomGenerator = () => import(/* webpackChunkName: "tool-random" */ '../views/tools/RandomGenerator.vue')
const Timer = () => import(/* webpackChunkName: "tool-timer" */ '../views/tools/Timer.vue')
const UnitConverter = () => import(/* webpackChunkName: "tool-unit-converter" */ '../views/tools/UnitConverter.vue')
const StickyNotes = () => import(/* webpackChunkName: "tool-sticky-notes" */ '../views/tools/StickyNotes.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/tool/json',
    name: 'JsonEditor',
    component: JsonEditor
  },
  {
    path: '/tool/timestamp',
    name: 'Timestamp',
    component: Timestamp
  },
  {
    path: '/tool/url',
    name: 'UrlCodec',
    component: UrlCodec
  },
  {
    path: '/tool/base64',
    name: 'Base64',
    component: Base64
  },
  {
    path: '/tool/regex',
    name: 'RegexTester',
    component: RegexTester
  },
  {
    path: '/tool/cron',
    name: 'CronGenerator',
    component: CronGenerator
  },
  {
    path: '/tool/sql',
    name: 'SqlFormatter',
    component: SqlFormatter
  },
  {
    path: '/tool/qrcode',
    name: 'QrcodeTool',
    component: QrcodeTool
  },
  {
    path: '/tool/text-diff',
    name: 'TextDiff',
    component: TextDiff
  },
  {
    path: '/tool/code-obfuscator',
    name: 'CodeObfuscator',
    component: CodeObfuscator
  },
  {
    path: '/tool/markdown',
    name: 'MarkdownEditor',
    component: MarkdownEditor
  },
  {
    path: '/tool/http-client',
    name: 'HttpClient',
    component: HttpClient
  },
  {
    path: '/tool/jwt',
    name: 'JwtParser',
    component: JwtParser
  },
  {
    path: '/tool/base-converter',
    name: 'BaseConverter',
    component: BaseConverter
  },
  {
    path: '/tool/image-compressor',
    name: 'ImageCompressor',
    component: ImageCompressor
  },
  {
    path: '/tool/date-calculator',
    name: 'DateCalculator',
    component: DateCalculator
  },
  {
    path: '/tool/json-schema',
    name: 'JsonSchema',
    component: JsonSchema
  },
  {
    path: '/tool/string-case',
    name: 'StringCaseConverter',
    component: StringCaseConverter
  },
  {
    path: '/tool/text-deduplicator',
    name: 'TextDeduplicator',
    component: TextDeduplicator
  },
  {
    path: '/tool/regex-reference',
    name: 'RegexReference',
    component: RegexReference
  },
  {
    path: '/tool/css-gradient',
    name: 'CssGradientGenerator',
    component: CssGradientGenerator
  },
  {
    path: '/tool/css-shadow',
    name: 'CssBoxShadowGenerator',
    component: CssBoxShadowGenerator
  },
  {
    path: '/tool/color-palette',
    name: 'ColorPalette',
    component: ColorPalette
  },
  {
    path: '/tool/csv-json',
    name: 'CsvJsonConverter',
    component: CsvJsonConverter
  },
  {
    path: '/tool/xml-json',
    name: 'XmlJsonConverter',
    component: XmlJsonConverter
  },
  {
    path: '/tool/hash',
    name: 'HashGenerator',
    component: HashGenerator
  },
  {
    path: '/tool/password',
    name: 'PasswordGenerator',
    component: PasswordGenerator
  },
  {
    path: '/tool/ip-lookup',
    name: 'IpLookup',
    component: IpLookup
  },
  {
    path: '/tool/user-agent',
    name: 'UserAgentParser',
    component: UserAgentParser
  },
  {
    path: '/tool/id-card',
    name: 'IdCardParser',
    component: IdCardParser
  },
  {
    path: '/tool/ascii-table',
    name: 'AsciiTable',
    component: AsciiTable
  },
  {
    path: '/tool/random',
    name: 'RandomGenerator',
    component: RandomGenerator
  },
  {
    path: '/tool/timer',
    name: 'Timer',
    component: Timer
  },
  {
    path: '/tool/unit-converter',
    name: 'UnitConverter',
    component: UnitConverter
  },
  {
    path: '/tool/sticky-notes',
    name: 'StickyNotes',
    component: StickyNotes
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  scrollBehavior() {
    return { x: 0, y: 0 }
  }
})

export default router
