const TEMPLATE_DIR = '/builder/template/templates/';
const TEMPLATE2_BUILDER_CONFIG = window.TEMPLATE2_BUILDER_CONFIG || {};
const CONTENT_TEMPLATE_BASE = '/builder/template/templates/';
const COMMON_TEMPLATE_BASE = '/builder/common/templates/';
const DESIGN_BLOCK_MANIFEST = TEMPLATE2_BUILDER_CONFIG.manifest || (CONTENT_TEMPLATE_BASE + 'design_block/manifest.json');
const TEMPLATE_FILE_PATTERN = /\.(html|js)$/i;
const TEMPLATE_IMAGE_PATTERN = /\.(png|jpe?g|webp|gif|svg)$/i;
const loadedTemplateStyles = new Map();
const activeTemplateStylePaths = new Set();
const TEMPLATE_BUILDER_DESIGN_BLOCK_CATEGORIES = new Set(['title', 'text', 'list']);

const ICON_MANIFEST = COMMON_TEMPLATE_BASE + 'common/icon/manifest.json';

const ICO_SVG_MAP = {
	'ico-box1': '<svg width="50" height="57" viewBox="0 0 50 57" fill="none"><g clip-path=""><path d="M35.6 55.4799H14.25L19.78 43.3599H30.07L35.6 55.4799Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M48.59 40.8198C48.59 42.7498 47.03 44.3098 45.1 44.3098H4.74C2.81 44.3098 1.25 42.7498 1.25 40.8198V8.57984C1.25 6.64984 2.81 5.08984 4.74 5.08984H45.1C47.03 5.08984 48.59 6.64984 48.59 8.57984V40.8198Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M12.6396 36.1997H37.1996" class="stroke-primary" stroke-width="2.5"/><path d="M36.8502 13.18C36.8502 19.77 31.5102 25.11 24.9202 25.11C18.3302 25.11 12.9902 19.77 12.9902 13.18C12.9902 6.59 18.3302 1.25 24.9202 1.25C31.5102 1.25 36.8502 6.59 36.8502 13.18Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.7305 13.2798L23.7705 17.3198L30.1105 9.0498" class="fill-white"/><path d="M19.7305 13.2798L23.7705 17.3198L30.1105 9.0498" class="stroke-accent" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_79_18487"><rect width="49.84" height="56.73" fill="white"/></clipPath></defs></svg>',
	'ico-box2': '<svg width="50" height="51" viewBox="0 0 50 51" fill="none"><g clip-path=""><path d="M22.22 1.25H1.25V48.86H22.22V1.25Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M14.47 6.5H9V20.85H14.47V6.5Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M11.7402 30.3101V37.3101" class="stroke-primary" stroke-width="2.5"/><path d="M48.4397 1.25H27.4697V48.86H48.4397V1.25Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linejoin="round"/><path d="M40.6897 6.5H35.2197V20.85H40.6897V6.5Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M37.9502 30.3101V37.3101" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_19949"><rect width="49.69" height="50.11" fill="white"/></clipPath></defs></svg>',
	'ico-box3': '<svg width="52" height="55" viewBox="0 0 52 55" fill="none"><g clip-path=""><path d="M35.89 52.8399H16L19.14 41.4399H32.75L35.89 52.8399Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M50.64 39.18C50.64 40.7 49.41 41.92 47.9 41.92H3.99C2.48 41.92 1.25 40.69 1.25 39.18V3.99C1.25 2.48 2.48 1.25 3.99 1.25H47.89C49.4 1.25 50.63 2.48 50.63 3.99V39.18H50.64Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M17.3398 18.04H10.5898V32.01H17.3398V18.04Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M29.4002 11.25H22.6602V32.01H29.4002V11.25Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linejoin="round"/><path d="M41.4697 15.3999H34.7197V32.0099H41.4697V15.3999Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_18515"><rect width="51.89" height="54.09" fill="white"/></clipPath></defs></svg>',
	'ico-box4': '<svg width="54" height="43" viewBox="0 0 54 43" fill="none"><g clip-path=""><path d="M1.57 1.25H21.81C24.43 1.25 26.55 3.1 26.55 5.39V36.86C26.55 34.57 24.43 32.72 21.81 32.72H1.57C1.46 32.72 1.36 32.73 1.25 32.73V1.26C1.36 1.26 1.46 1.25 1.57 1.25Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M51.5496 1.25H31.3096C28.6896 1.25 26.5596 3.1 26.5596 5.39V36.86C26.5596 34.57 28.6896 32.72 31.3096 32.72H51.5496C51.6596 32.72 51.7596 32.73 51.8696 32.73V1.26C51.7496 1.26 51.6496 1.25 51.5496 1.25Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M8.03027 7.9502H15.0203" class="stroke-primary" stroke-width="2.5"/><path d="M8.03027 14.6001H15.0203" class="stroke-primary" stroke-width="2.5"/><path d="M8.03027 21.2402H15.0203" class="stroke-primary" stroke-width="2.5"/><path d="M38.0898 7.9502H45.0798" class="stroke-accent" stroke-width="2.5"/><path d="M38.0898 14.6001H45.0798" class="stroke-accent" stroke-width="2.5"/><path d="M38.0898 21.2402H45.0798" class="stroke-accent" stroke-width="2.5"/><path d="M0.0595703 41.2402H53.0596" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2251"><rect width="53.11" height="42.49" fill="white"/></clipPath></defs></svg>',
	'ico-box5': '<svg width="51" height="50" viewBox="0 0 51 50" fill="none"><g clip-path=""><path d="M49.34 45.5001C49.34 46.8501 48.12 47.9401 46.63 47.9401H3.97C2.47 47.9401 1.25 46.8401 1.25 45.5001V19.2701C1.25 17.9201 2.47 16.8301 3.97 16.8301H46.63C48.13 16.8301 49.34 17.9301 49.34 19.2701V45.5001Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M35.0296 47.95H25.2896H15.5596V27.09V11.23L25.2896 1.75L35.0296 11.23V27.09V47.95Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M25.2899 25.1502C27.2892 25.1502 28.9099 23.5294 28.9099 21.5302C28.9099 19.5309 27.2892 17.9102 25.2899 17.9102C23.2907 17.9102 21.6699 19.5309 21.6699 21.5302C21.6699 23.5294 23.2907 25.1502 25.2899 25.1502Z" class="stroke-accent fill-white" stroke-width="2.5"/><path d="M22.1299 32.0898H28.4599" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2270"><rect width="50.59" height="49.2" fill="white"/></clipPath></defs></svg>',
	'ico-box6': '<svg width="53" height="58" viewBox="0 0 53 58" fill="none"><g clip-path=""><path d="M42.9402 44.5199V30.7299C42.9402 21.5499 35.5002 14.1099 26.3202 14.1099C17.1402 14.1099 9.7002 21.5499 9.7002 30.7299V44.5199" class="fill-tertiary"/><path d="M42.9402 44.5199V30.7299C42.9402 21.5499 35.5002 14.1099 26.3202 14.1099C17.1402 14.1099 9.7002 21.5499 9.7002 30.7299V44.5199" class="stroke-primary" stroke-width="2.5"/><path d="M23.8602 21.1602C19.9402 21.1602 16.7402 24.3502 16.7402 28.2702L23.8602 21.1602Z" class="fill-tertiary"/><path d="M23.8602 21.1602C19.9402 21.1602 16.7402 24.3502 16.7402 28.2702" class="stroke-primary" stroke-width="2.5"/><path d="M51.39 54.0301C51.39 48.9701 47.29 44.8701 42.22 44.8701H10.41C5.35 44.8701 1.25 48.9701 1.25 54.0301V56.2401H51.39V54.0301Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M26.3193 0V7.49" class="stroke-accent" stroke-width="2.5"/><path d="M10.4697 4.25L14.2097 10.73" class="stroke-accent" stroke-width="2.5"/><path d="M38.4297 10.73L42.1697 4.25" class="stroke-accent" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2279"><rect width="52.64" height="57.5" fill="white"/></clipPath></defs></svg>',
	'ico-box7': '<svg width="51" height="50" viewBox="0 0 51 50" fill="none"><g clip-path=""><path d="M39.83 5.29004H44.72C45.02 5.29004 45.31 5.32004 45.59 5.38004C45.87 5.44004 46.14 5.52004 46.4 5.63004C46.66 5.74004 46.91 5.87004 47.14 6.03004C47.37 6.19004 47.58 6.36004 47.78 6.56004C47.98 6.76004 48.16 6.97004 48.31 7.20004C48.47 7.43004 48.6 7.68004 48.71 7.94004C48.82 8.20004 48.91 8.47004 48.96 8.75004C49.02 9.03004 49.05 9.32004 49.05 9.62004V13.87V18.11V22.35V26.6V30.84V35.09V39.33V43.58C49.05 43.88 49.02 44.17 48.96 44.45C48.9 44.73 48.82 45 48.71 45.26C48.6 45.52 48.47 45.77 48.31 46C48.16 46.23 47.98 46.45 47.78 46.64C47.58 46.84 47.37 47.01 47.14 47.17C46.91 47.33 46.66 47.46 46.4 47.57C46.14 47.68 45.87 47.76 45.59 47.82C45.31 47.88 45.02 47.91 44.72 47.91H39.83H34.94H30.05H25.16H20.27H15.38H10.49H5.58C5.28 47.91 4.99 47.88 4.71 47.82C4.43 47.76 4.16 47.68 3.9 47.57C3.64 47.46 3.39 47.33 3.16 47.17C2.93 47.02 2.72 46.84 2.52 46.64C2.32 46.44 2.15 46.23 1.99 46C1.83 45.77 1.7 45.52 1.59 45.26C1.48 45 1.39 44.73 1.34 44.45C1.28 44.17 1.25 43.88 1.25 43.58V39.33V35.09V30.84V26.6V22.35V18.11V13.87V9.62004C1.25 9.32004 1.28 9.03004 1.34 8.75004C1.4 8.47004 1.48 8.19004 1.59 7.94004C1.7 7.67004 1.83 7.43004 1.99 7.20004C2.15 6.97004 2.32 6.76004 2.52 6.56004C2.72 6.36004 2.93 6.18004 3.16 6.03004C3.39 5.87004 3.64 5.74004 3.9 5.63004C4.16 5.52004 4.43 5.44004 4.71 5.38004C4.99 5.32004 5.28 5.29004 5.58 5.29004H10.47" class="fill-tertiary"/><path d="M39.83 5.29004H44.72C45.02 5.29004 45.31 5.32004 45.59 5.38004C45.87 5.44004 46.14 5.52004 46.4 5.63004C46.66 5.74004 46.91 5.87004 47.14 6.03004C47.37 6.19004 47.58 6.36004 47.78 6.56004C47.98 6.76004 48.16 6.97004 48.31 7.20004C48.47 7.43004 48.6 7.68004 48.71 7.94004C48.82 8.20004 48.91 8.47004 48.96 8.75004C49.02 9.03004 49.05 9.32004 49.05 9.62004V13.87V18.11V22.35V26.6V30.84V35.09V39.33V43.58C49.05 43.88 49.02 44.17 48.96 44.45C48.9 44.73 48.82 45 48.71 45.26C48.6 45.52 48.47 45.77 48.31 46C48.16 46.23 47.98 46.45 47.78 46.64C47.58 46.84 47.37 47.01 47.14 47.17C46.91 47.33 46.66 47.46 46.4 47.57C46.14 47.68 45.87 47.76 45.59 47.82C45.31 47.88 45.02 47.91 44.72 47.91H39.83H34.94H30.05H25.16H20.27H15.38H10.49H5.58C5.28 47.91 4.99 47.88 4.71 47.82C4.43 47.76 4.16 47.68 3.9 47.57C3.64 47.46 3.39 47.33 3.16 47.17C2.93 47.02 2.72 46.84 2.52 46.64C2.32 46.44 2.15 46.23 1.99 46C1.83 45.77 1.7 45.52 1.59 45.26C1.48 45 1.39 44.73 1.34 44.45C1.28 44.17 1.25 43.88 1.25 43.58V39.33V35.09V30.84V26.6V22.35V18.11V13.87V9.62004C1.25 9.32004 1.28 9.03004 1.34 8.75004C1.4 8.47004 1.48 8.19004 1.59 7.94004C1.7 7.67004 1.83 7.43004 1.99 7.20004C2.15 6.97004 2.32 6.76004 2.52 6.56004C2.72 6.36004 2.93 6.18004 3.16 6.03004C3.39 5.87004 3.64 5.74004 3.9 5.63004C4.16 5.52004 4.43 5.44004 4.71 5.38004C4.99 5.32004 5.28 5.29004 5.58 5.29004H10.47" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.2598 5.29004H25.1498H30.0498" class="fill-tertiary"/><path d="M20.2598 5.29004H25.1498H30.0498" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5098 1.25V9.6" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M34.7998 1.25V9.6" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.67969 17.3799H48.0497" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M32.5103 39.0501L31.7103 34.3901C31.7103 34.3901 34.8503 31.2801 34.9903 31.1401C36.6203 29.5501 36.3103 27.9801 34.3903 27.4301L29.2003 26.6801L26.9403 22.1101C25.9003 20.4001 24.3903 20.4001 23.3403 22.1101L21.0803 26.6801L15.8903 27.4301C13.9703 27.9801 13.6603 29.5501 15.2903 31.1401C15.4303 31.2801 18.5703 34.3901 18.5703 34.3901L17.7703 39.0501C17.4503 41.3901 18.9003 42.3801 21.0703 41.2401C21.2703 41.1401 25.1203 39.1601 25.1203 39.1601C25.1203 39.1601 28.9803 41.1401 29.1703 41.2401C31.3803 42.3801 32.8303 41.3901 32.5103 39.0501Z" class="stroke-accent fill-white" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2341"><rect width="50.31" height="49.16" fill="white"/></clipPath></defs></svg>',
	'ico-box8': '<svg width="43" height="56" viewBox="0 0 43 56" fill="none"><g clip-path=""><path d="M35.2103 34.9501C42.9203 27.2401 42.9203 14.7401 35.2103 7.03006C27.5003 -0.679941 15.0003 -0.679941 7.29031 7.03006C-0.419687 14.7401 -0.419687 27.2401 7.29031 34.9501L21.2503 48.9001L35.2103 34.9501Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M27.9803 19.8699C27.9803 23.5899 24.9703 26.5999 21.2603 26.5999C17.5403 26.5999 14.5303 23.5899 14.5303 19.8699C14.5303 16.1599 17.5403 13.1499 21.2603 13.1499C24.9703 13.1399 27.9803 16.1599 27.9803 19.8699Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.25 54.1001H41.25" class="stroke-accent" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_78_2335"><rect width="42.5" height="55.35" fill="white"/></clipPath></defs></svg>',
	'ico-box9': '<svg width="53" height="50" viewBox="0 0 53 50" fill="none"><g clip-path=""><path d="M18.21 48.4C16.32 48.4 13.67 47.3 12.33 45.97L3.68 37.32C2.34 35.98 1.25 33.34 1.25 31.44V4.69C1.25 2.8 2.8 1.25 4.69 1.25H38.12C40.01 1.25 41.56 2.8 41.56 4.69V44.96C41.56 46.85 40.01 48.4 38.12 48.4H18.21Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M11.3296 34.8799C13.2196 34.8799 14.7696 36.4299 14.7696 38.3199V44.9499C14.7696 46.8399 13.6796 47.2999 12.3296 45.9599L3.67957 37.3099C2.33957 35.9699 2.79957 34.8799 4.68957 34.8799H11.3296Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M51.65 21.12C51.65 27.71 46.31 33.05 39.72 33.05C33.13 33.05 27.79 27.71 27.79 21.12C27.79 14.53 33.13 9.18996 39.72 9.18996C46.31 9.17996 51.65 14.53 51.65 21.12Z" class="stroke-accent fill-tertiary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M34.5303 21.21L38.5603 25.25L44.9103 16.98" class="fill-tertiary"/><path d="M34.5303 21.21L38.5603 25.25L44.9103 16.98" class="stroke-accent" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.55957 12.25H13.5596" class="stroke-primary" stroke-width="2.5"/><path d="M6.55957 22.25H13.5596" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2366"><rect width="52.9" height="49.65" fill="white"/></clipPath></defs></svg>',
	'ico-box10': '<svg width="47" height="49" viewBox="0 0 47 49" fill="none"><g clip-path=""><path d="M44.93 1.25H1.25V34.23H44.93V1.25Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M19.3398 11.3599L30.3998 17.7399L19.3398 24.1299V11.3599Z" class="stroke-accent fill-white" stroke-width="2.5"/><path d="M0 43.96H15.87" class="stroke-accent" stroke-width="2.5"/><path d="M23.3604 43.96H46.1804" class="stroke-accent" stroke-width="2.5"/><path d="M23.3597 43.9601C23.3597 45.9301 21.7597 47.5201 19.7897 47.5201C17.8197 47.5201 16.2197 45.9201 16.2197 43.9601C16.2197 41.9901 17.8197 40.3901 19.7897 40.3901C21.7597 40.4001 23.3597 42.0001 23.3597 43.9601Z" class="stroke-accent fill-white" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_18496"><rect width="46.18" height="48.78" fill="white"/></clipPath></defs></svg>',
	'ico-box11': '<svg width="56" height="47" viewBox="0 0 56 47" fill="none"><g clip-path=""><path d="M23.1602 18.17H15.9902V6.32C15.9902 3.52 18.2602 1.25 21.0702 1.25H48.7202C51.5202 1.25 53.7902 3.52 53.7902 6.32V25.35C53.7902 28.15 51.5202 30.42 48.7202 30.42H43.1402V42.09L30.8302 30.42H26.5502V21.56C26.5502 19.69 25.0302 18.17 23.1602 18.17Z" class="stroke-primary fill-white" stroke-width="2.5" stroke-linejoin="round"/><path d="M4.65 18.1699H23.16C25.03 18.1699 26.56 19.6899 26.56 21.5699V34.2999C26.56 36.1799 25.04 37.6999 23.16 37.6999H16.62L8.39 45.5099V37.6999H4.65C2.77 37.6999 1.25 36.1799 1.25 34.2999V21.5599C1.25 19.6899 2.77 18.1699 4.65 18.1699Z" class="stroke-primary fill-tertiary" stroke-width="2.5" stroke-linejoin="round"/><path d="M43.15 9.7002H35.54" class="stroke-accent" stroke-width="2.5"/><path d="M43.15 17.5601H35.54" class="stroke-accent" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_18506"><rect width="55.03" height="46.76" fill="white"/></clipPath></defs></svg>',
	'ico-box12': '<svg width="54" height="51" viewBox="0 0 54 51" fill="none"><g clip-path=""><path d="M47.5198 44.0501C47.5198 45.4701 46.3698 46.6301 44.9398 46.6301H8.6298C7.2098 46.6301 6.0498 45.4801 6.0498 44.0501V11.4101C6.0498 9.99008 7.1998 8.83008 8.6298 8.83008H44.9398C46.3598 8.83008 47.5198 9.98008 47.5198 11.4101V44.0501Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M1.25 41.4199V44.8799C1.25 47.3199 3.23 49.2899 5.66 49.2899H47.91C50.35 49.2899 52.32 47.3099 52.32 44.8799V41.4199H1.25Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M36.0803 1.25H19.0803C16.8703 1.25 15.0703 3.04 15.0703 5.26V16.41C15.0703 18.62 16.8603 20.42 19.0803 20.42H23.8403V27.89L30.1403 20.42H36.0703C38.2803 20.42 40.0703 18.63 40.0703 16.41V5.26C40.0903 3.04 38.2903 1.25 36.0803 1.25Z" class="stroke-accent fill-tertiary" stroke-width="2.5"/><path d="M23.1006 7.4502H32.0706" class="stroke-accent fill-tertiary" stroke-width="2.5"/><path d="M23.1006 13H32.0706" class="stroke-accent fill-tertiary" stroke-width="2.5"/></g><defs><clipPath id="clip0_63_7054"><rect width="53.58" height="50.54" fill="white"/></clipPath></defs></svg>'
};
let ICON_CATEGORIES = [];

async function loadIconCategories() {
	try {
		const res = await fetch(ICON_MANIFEST, { cache: 'no-store' });
		if (res.ok) ICON_CATEGORIES = normalizeIconCategories(await res.json());
	} catch (e) {
		console.warn('아이콘 매니페스트를 불러오지 못했습니다.', e);
	}
}

function normalizeAssetPath(path) {
	if (!path || /^data:/i.test(path) || /^https?:\/\//i.test(path) || path.startsWith('/')) return path;
	if (path.startsWith('templates/common/icon/')) return COMMON_TEMPLATE_BASE + path.slice('templates/'.length);
	if (path.startsWith('templates/')) return CONTENT_TEMPLATE_BASE + path.slice('templates/'.length);
	return path;
}

function normalizeIconCategories(categories) {
	return (categories || []).map(cat => ({
		...cat,
		icons: (cat.icons || []).map(icon => ({ ...icon, src: normalizeAssetPath(icon.src) })),
		groups: (cat.groups || []).map(group => ({
			...group,
			icons: (group.icons || []).map(icon => ({ ...icon, src: normalizeAssetPath(icon.src) }))
		}))
	}));
}

const componentTemplates = {};

const state = {
	blocks: [],
	nextBlockId: 1,
	dragPayload: '',
	templateFilter: 'all',
	designTemplateFilter: 'all',
	sidebarTab: TEMPLATE2_BUILDER_CONFIG.defaultSidebarTab || 'blocks',
	selectedItem: null,
	tableCellDrag: null,
	overlays: [],
	undoStack: [],
	previewDevice: 'pc',
	canvasWidth: '1241',
	templateVars: {}
};

function getBuilderConfigList(key) {
	const value = TEMPLATE2_BUILDER_CONFIG[key];
	if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
	if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
	return [];
}

const VISIBLE_BLOCK_FILTERS = getBuilderConfigList('visibleBlockFilters');
const VISIBLE_DESIGN_FILTERS = getBuilderConfigList('visibleDesignFilters');

function isFilterVisible(value, visibleFilters) {
	return !visibleFilters.length || value === 'all' && visibleFilters.includes('all') || visibleFilters.includes(value);
}

function isBlockCategoryVisible(category) {
	const categoryFilters = VISIBLE_BLOCK_FILTERS.filter(value => value !== 'all');
	if (!categoryFilters.length) {
		return true;
	}
	return categoryFilters.includes(category);
}

function isDesignTemplateVisible(template) {
	const designFilters = VISIBLE_DESIGN_FILTERS.filter(value => value !== 'all');
	if (!designFilters.length) {
		return true;
	}
	return designFilters.includes(getDesignTemplateSubCategory(template.id));
}

function applyBuilderPresetFilters() {
	document.querySelectorAll('[data-template-filter]').forEach(button => {
		button.hidden = !isFilterVisible(button.dataset.templateFilter, VISIBLE_BLOCK_FILTERS);
	});
	document.querySelectorAll('[data-design-template-filter]').forEach(button => {
		button.hidden = !isFilterVisible(button.dataset.designTemplateFilter, VISIBLE_DESIGN_FILTERS);
	});

	if (!document.querySelector(`[data-template-filter="${state.templateFilter}"]:not([hidden])`)) {
		const firstBlockFilter = document.querySelector('[data-template-filter]:not([hidden])');
		state.templateFilter = firstBlockFilter?.dataset.templateFilter || 'all';
	}
	if (!document.querySelector(`[data-design-template-filter="${state.designTemplateFilter}"]:not([hidden])`)) {
		const firstDesignFilter = document.querySelector('[data-design-template-filter]:not([hidden])');
		state.designTemplateFilter = firstDesignFilter?.dataset.designTemplateFilter || 'all';
	}
	document.querySelectorAll('[data-template-filter]').forEach(button => {
		button.classList.toggle('is-active', button.dataset.templateFilter === state.templateFilter);
	});
	document.querySelectorAll('[data-design-template-filter]').forEach(button => {
		button.classList.toggle('is-active', button.dataset.designTemplateFilter === state.designTemplateFilter);
	});
}

// Filled automatically when manifest.json is loaded.
const templateCategories = {};
const templateBasePaths = {}; // { 'box-01': 'templates/design_block/box/box-01', ... }

const TITLE_HIERARCHY = ['title-01', 'title-02', 'title-03', 'title-04'];

function isTitleBlock(type) {
	return TITLE_HIERARCHY.includes(type);
}

function demoteTitleType(targetType) {
	const idx = TITLE_HIERARCHY.indexOf(targetType);
	if (idx < 0 || idx >= TITLE_HIERARCHY.length - 1) return null;
	return TITLE_HIERARCHY[idx + 1];
}

const canvasGrid = document.getElementById('canvasGrid');
const markupOutput = document.getElementById('markupOutput');
const layoutStatus = document.getElementById('layoutStatus');
const copyState = document.getElementById('copyState');
const previewToggle = document.getElementById('previewToggle');
const previewReturn = document.getElementById('previewReturn');
const savePreviewImageButton = document.getElementById('savePreviewImage');
const saveProjectJsonButton = document.getElementById('saveProjectJson');
// const saveFileButton = document.getElementById('saveFileButton');
// const loadProjectKlicButton = document.getElementById('loadProjectKlic');
// const loadProjectKlicInput = document.getElementById('loadProjectKlicInput');
const saveFileButton = document.getElementById('saveFileButton') || document.getElementById('savePdfButton');
const loadProjectKlicButton = document.getElementById('loadKlic');
const loadProjectKlicInput = document.getElementById('klicFileInput');
const previewMarkupOpenButton = document.getElementById('previewMarkupOpen');
const markupToggle = document.getElementById('markupToggle');
const componentList = document.getElementById('componentList');
let _markupTabs = null;
let _lastFullMarkup = '';

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function escapeAttr(value) {
	return escapeHtml(value);
}

function formatMultiline(value) {
	return escapeHtml(value).replace(/\n/g, '<br>');
}

function cloneData(data) {
	return JSON.parse(JSON.stringify(data));
}

function _innerBlockActionsHtml(propsHtml, removeBtnHtml) {
	return `<div class="inner-block-actions">${propsHtml}${removeBtnHtml}</div>`;
}

function resolveMixInnerRef(blockId) {
	// process-02 step inner ref: "blockId::pstep::N::inner::M"
	const mp = typeof blockId === 'string' && blockId.match(/^(.+)::pstep::(\d+)::inner::(\d+)$/);
	if (mp) {
		const outerBlock = state.blocks.find(b => b.id === mp[1]);
		if (!outerBlock) return null;
		const stepIdx = parseInt(mp[2], 10);
		const innerIdx = parseInt(mp[3], 10);
		const item = outerBlock.items?.[stepIdx];
		if (!item || !Array.isArray(item.innerBlocks)) return null;
		const innerBlock = item.innerBlocks[innerIdx];
		if (!innerBlock) return null;
		return { outerBlock, innerIdx, innerBlock };
	}
	// mix container inner ref: "blockId::inner::N"
	const m = typeof blockId === 'string' && blockId.match(/^(.+)::inner::(\d+)$/);
	if (!m) return null;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	if (!outerBlock || !Array.isArray(outerBlock.innerBlocks)) return null;
	const innerIdx = parseInt(m[2], 10);
	const innerBlock = outerBlock.innerBlocks[innerIdx];
	if (!innerBlock) return null;
	return { outerBlock, innerIdx, innerBlock };
}

function resolveListInnerRef(blockId) {
	const m = typeof blockId === 'string' && blockId.match(/^(.+)::list::(\d+)$/);
	if (!m) return null;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	if (!outerBlock) return null;
	const colIdx = parseInt(m[2], 10);
	const item = outerBlock.items[colIdx];
	if (!item || !item.listBlock) return null;
	return { outerBlock, listBlock: item.listBlock, colIdx };
}

function resolveTableCellInnerRef(blockId) {
	const m = typeof blockId === 'string' && blockId.match(/^(.+)::tcell::(.+)$/);
	if (!m) return null;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	if (!outerBlock) return null;
	const cellKey = m[2];
	const innerBlockData = outerBlock.tableCellInnerBlocks?.[cellKey];
	if (!innerBlockData) return null;
	return { outerBlock, innerBlockData, cellKey };
}

function getTableCellSlotKeys(block, cellKey) {
	if (!block?.tableCellBlockZones?.[cellKey]) return [];
	const keys = [cellKey];
	const extraKeys = Object.keys(block.tableCellBlockZones)
		.filter(key => key.startsWith(`${cellKey}__slot`))
		.sort((a, b) => Number(a.match(/__slot(\d+)$/)?.[1] || 0) - Number(b.match(/__slot(\d+)$/)?.[1] || 0));
	return keys.concat(extraKeys);
}

function getNextTableCellSlotKey(block, cellKey) {
	const keys = getTableCellSlotKeys(block, cellKey);
	let next = 1;
	keys.forEach(key => {
		const n = Number(key.match(/__slot(\d+)$/)?.[1] || 0);
		if (n >= next) next = n + 1;
	});
	return `${cellKey}__slot${next}`;
}

function clearTableCellBlockZone(block, cellKey) {
	getTableCellSlotKeys(block, cellKey).forEach(slotKey => {
		delete block.tableCellBlockZones?.[slotKey];
		if (block.tableCellInnerBlocks?.[slotKey]) delete block.tableCellInnerBlocks[slotKey];
	});
}

function getEditTargetItems(blockId) {
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) return mixRef.innerBlock.items;
	const listRef = resolveListInnerRef(blockId);
	if (listRef) return listRef.listBlock.items;
	const tableCellRef = resolveTableCellInnerRef(blockId);
	if (tableCellRef) return tableCellRef.innerBlockData.items;
	return state.blocks.find(b => b.id === blockId)?.items;
}

function resolveEditableBlockData(blockId) {
	const block = state.blocks.find(b => b.id === blockId);
	if (block) return block;
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) return mixRef.innerBlock;
	const tcellRef = resolveTableCellInnerRef(blockId);
	if (tcellRef) return tcellRef.innerBlockData;
	return null;
}

function resolveBlockForRows(blockId) {
	const block = state.blocks.find(b => b.id === blockId);
	if (block) return block;
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) {
		return { id: blockId, type: mixRef.innerBlock.type, items: mixRef.innerBlock.items };
	}
	const tcellRef = resolveTableCellInnerRef(blockId);
	if (tcellRef) {
		return { id: blockId, type: tcellRef.innerBlockData.type, items: tcellRef.innerBlockData.items };
	}
	return null;
}

function findItemByBlockId(blockId, columnIndex) {
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) return mixRef.innerBlock.items[columnIndex] ?? null;
	const listRef = resolveListInnerRef(blockId);
	if (listRef) return listRef.listBlock.items[columnIndex] ?? null;
	const tcellRef = resolveTableCellInnerRef(blockId);
	if (tcellRef) return tcellRef.innerBlockData.items[columnIndex] ?? null;
	const block = state.blocks.find(b => b.id === blockId);
	return block?.items[columnIndex] ?? null;
}

function hasListWrap(blockType) {
	const template = componentTemplates[blockType];
	return !!(template && template.element.querySelector('.list-wrap'));
}

function switchFilterTab(filterValue) {
	const btn = document.querySelector(`[data-template-filter="${filterValue}"]`);
	if (!btn) return;
	state.templateFilter = filterValue;
	document.querySelectorAll('[data-template-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
	renderComponentList();
}

const FONT_SIZES = ['14', '15', '16', '18', '20', '22', '24', '26'];
const MAX_HISTORY = 50;
let _historyGroupPending = false;
let _duplicatingBlock = false;

function pushHistory() {
	state.undoStack.push(cloneData(state.blocks));
	if (state.undoStack.length > MAX_HISTORY) state.undoStack.shift();
}

function pushHistoryGrouped() {
	if (_historyGroupPending) return;
	_historyGroupPending = true;
	pushHistory();
	setTimeout(() => { _historyGroupPending = false; }, 500);
}

function undo() {
	if (!state.undoStack.length) return;
	state.blocks = state.undoStack.pop();
	state.nextBlockId = state.blocks.reduce((max, b) => {
		const n = parseInt(b.id.replace('block-', ''), 10);
		return isNaN(n) ? max : Math.max(max, n + 1);
	}, 1);
	state.selectedItem = null;
	render();
}

function createDefaultStyle() {
	return {
		titleBorderColor: '#dfe5ee',
		titleBackgroundColor: '#7989a2',
		titleTextColor: '#ffffff',
		titleFontWeight: '700',
		bodyBorderColor: '#dfe5ee',
		bodyBackgroundColor: '#ffffff',
		bodyTextColor: '#101010',
		bodyFontWeight: '400',
		connectorColor: '#333333',
		connectorSize: '1'
	};
}

function getColumnStyle(item) {
	if (!item.style) {
		item.style = createDefaultStyle();
	}
	return item.style;
}

const ALIGN_TO_JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' };

function columnStyleVars(item) {
	const style = getColumnStyle(item);
	return [
		`--title-border: ${style.titleBorderColor}`,
		`--title-bg: ${style.titleBackgroundColor}`,
		`--title-text: ${style.titleTextColor}`,
		`--title-weight: ${style.titleFontWeight}`,
		style.titleFontSize != null && `--title-size: ${style.titleFontSize}px`,
		style.titleTextAlign && `--title-align: ${style.titleTextAlign}`,
		style.titleTextAlign && `--title-justify: ${ALIGN_TO_JUSTIFY[style.titleTextAlign] || style.titleTextAlign}`,
		`--body-border: ${style.bodyBorderColor}`,
		`--body-bg: ${style.bodyBackgroundColor}`,
		`--body-text: ${style.bodyTextColor}`,
		`--body-weight: ${style.bodyFontWeight}`,
		style.bodyFontSize != null && `--body-size: ${style.bodyFontSize}px`,
		style.bodyTextAlign && `--body-align: ${style.bodyTextAlign}`,
		`--connector-color: ${style.connectorColor}`,
		`--connector-size: ${style.connectorSize}`
	].filter(Boolean).join('; ');
}

function columnMarkupStyle(item) {
	return ` style="${columnStyleVars(item)}"`;
}

function toStyleKey(rawKey) {
	return rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function readDefaultStyle(root) {
	return Array.from(root.attributes).reduce((style, attr) => {
		if (!attr.name.startsWith('data-style-')) return style;
		style[toStyleKey(attr.name.replace('data-style-', ''))] = attr.value;
		return style;
	}, {});
}

function applyTemplateVars(text) {
	if (!text || !Object.keys(state.templateVars).length) return text;
	return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		const val = state.templateVars[key];
		return (val !== undefined && val !== '') ? val : `{{${key}}}`;
	});
}

// "2026-06-11" -> "2026년 06월 11일"
function _ppFormatDateToKorean(isoDate) {
	const [y, m, d] = isoDate.split('-');
	if (!y || !m || !d) return isoDate;
	return `${y}년 ${m}월 ${d}일`;
}

// "2026년 06월 11일" -> "2026-06-11"
function _ppFormatDateToInput(koreanDate) {
	const match = String(koreanDate || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
	if (!match) return '';
	return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function setFieldContent(element, value) {
	element.innerHTML = applyTemplateVars(String(value || ''));
}

function stripEditorAttributes(root) {
	Array.from(root.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			root.removeAttribute(attr.name);
		}
	});
	root.querySelectorAll('[contenteditable]').forEach(element => element.removeAttribute('contenteditable'));
	root.querySelectorAll('[data-block-id]').forEach(element => element.removeAttribute('data-block-id'));
	root.querySelectorAll('[data-column-index]').forEach(element => element.removeAttribute('data-column-index'));
	root.classList.remove('add-row-wrap', 'block-item');
	root.querySelectorAll('.add-row-wrap').forEach(element => element.classList.remove('add-row-wrap'));
	root.querySelectorAll('.block-item').forEach(element => element.classList.remove('block-item'));
	root.querySelectorAll('[data-box-img]').forEach(element => element.removeAttribute('data-box-img'));
	root.querySelectorAll('[data-tab-block-id]').forEach(element => element.removeAttribute('data-tab-block-id'));
	root.querySelectorAll('[data-tab-item-idx]').forEach(element => element.removeAttribute('data-tab-item-idx'));
	// history-tyA 슬라이드는 자유 형식 HTML 스냅샷(historyListSlideHtml)으로 저장되므로,
	// 과거 세션에서 관리자 버튼이 포함된 채 저장된 경우를 대비한 방어적 제거.
	root.querySelectorAll('.history-row-actions, .history-add-year-row, .history-tya-timeline-year-del, .history-canvas-nav, .history-section-year-add, .history-section-year-add-row, .history-year-dl-actions').forEach(element => element.remove());
	root.querySelectorAll('[data-history-tyb-bound]').forEach(element => element.removeAttribute('data-history-tyb-bound'));
	root.querySelectorAll('[data-history-tyc-bound]').forEach(element => element.removeAttribute('data-history-tyc-bound'));
	// principal-tyA-list 팝업 학력/주요업적 스냅샷(principalAchieve{suffix})에
	// 방어적으로 편집 버튼/캔버스 전용 저장 버튼이 남아있는 경우를 대비한 제거.
	root.querySelectorAll('.principal-tya-year-actions, .principal-tya-content-actions, .principal-tya-popup-save-btn').forEach(element => element.remove());
	root.classList.remove('is-canvas-open');
	root.querySelectorAll('.is-canvas-open').forEach(element => element.classList.remove('is-canvas-open'));
}

function renderTemplateElement(template, item, block = null, columnIndex = null, editable = false) {
	const element = template.element.cloneNode(true);
	Array.from(element.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			element.removeAttribute(attr.name);
		}
	});
	element.querySelectorAll('[data-edit-field]').forEach(field => {
		const fieldName = field.dataset.editField;
		const attrName = field.dataset.editAttr;
		if (attrName) {
			const attrVal = item[fieldName] || '';
			if (attrVal) field.setAttribute(attrName, attrVal);
			if (editable && block) {
				field.dataset.blockId = block.id;
				field.dataset.columnIndex = String(columnIndex);
				return;
			}
			field.removeAttribute('data-edit-field');
			field.removeAttribute('data-edit-attr');
			return;
		}
		setFieldContent(field, item[fieldName] || '');
		if (fieldName === 'icon' && (item.iconWidth || item.iconHeight)) {
			const img = field.querySelector('.block-icon-img');
			if (img) {
				if (item.iconWidth) { img.style.width = `${item.iconWidth}px`; img.style.maxWidth = 'none'; }
				if (item.iconHeight) { img.style.height = `${item.iconHeight}px`; }
			}
		}
		if (editable && block) {
			field.dataset.blockId = block.id;
			field.dataset.columnIndex = String(columnIndex);
			return;
		}
		field.removeAttribute('data-edit-field');
	});

	element.querySelectorAll('[data-edit-visible-if]').forEach(el => {
		const key = el.dataset.editVisibleIf;
		const hasValue = !!(item[key] && String(item[key]).trim());
		el.style.display = hasValue ? '' : 'none';
		if (!editable) el.removeAttribute('data-edit-visible-if');
	});

	if (!editable) {
		stripEditorAttributes(element);
	}

	return element;
}

function elementToHtml(element) {
	const wrapper = document.createElement('div');
	wrapper.appendChild(element);
	return wrapper.innerHTML.trim();
}

function htmlToLines(html) {
	return html.split('\n').map(line => line.trimEnd());
}

function getDefaultData(element) {
	const data = {};
	element.querySelectorAll('[data-edit-field]').forEach(field => {
		const attrName = field.dataset.editAttr;
		data[field.dataset.editField] = attrName ? (field.getAttribute(attrName) || '') : field.innerHTML;
	});
	return data;
}

function normalizeTemplatePath(path) {
	let normalized;
	if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
		normalized = path;
	} else if (path.startsWith('templates/')) {
		normalized = CONTENT_TEMPLATE_BASE + path.slice('templates/'.length);
	} else {
		normalized = TEMPLATE_DIR + path;
	}
	if (TEMPLATE_FILE_PATTERN.test(normalized) || TEMPLATE_IMAGE_PATTERN.test(normalized)) return normalized;
	return normalized.replace(/\/?$/, '/') + 'index.html';
}

function normalizeTemplateFolder(path) {
	let normalized;
	if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
		normalized = path;
	} else if (path.startsWith('templates/')) {
		normalized = CONTENT_TEMPLATE_BASE + path.slice('templates/'.length);
	} else {
		normalized = TEMPLATE_DIR + path;
	}
	return normalized.replace(/\/?$/, '');
}

function inferCntBuilderTemplateCategory(path) {
	if (/\/design_template\//.test(path)) return 'design-template';
	if (/\/common\/decoration\//.test(path)) return 'decoration';
	const presetMatch = path.match(/\/(principal|greeting|history|work|symbol|schoolSong|school-song)\//);
	if (presetMatch) return presetMatch[1] === 'school-song' ? 'schoolSong' : presetMatch[1];
	const match = path.match(/\/design_block\/([^/]+)\//);
	return match ? match[1] : '';
}

function inferCntBuilderTemplateId(path) {
	const normalized = path.replace(/\\/g, '/');
	const parts = normalized.split('/').filter(Boolean);
	const file = parts.at(-1) || '';
	const folder = parts.at(-2) || '';
	if (/^index\.html$/i.test(file) || !/\.[^.]+$/i.test(file)) return folder;
	if (/\/common\/decoration\/(kinder|elem|middle|high|illust|deco)\//.test(normalized)) {
		const n = file.replace(/\.[^.]+$/i, '').padStart(2, '0');
		return `${folder}-${n}`;
	}
	return file.replace(/\.[^.]+$/, '');
}

function parseDirectoryListing(html) {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return Array.from(doc.querySelectorAll('a[href]'))
		.map(link => link.getAttribute('href'))
		.filter(Boolean)
		.map(href => href.split('?')[0].split('#')[0].replace(/\\/g, '/'))
		.filter(href => !href.startsWith('/') && !href.includes('..'))
		.filter(href => TEMPLATE_FILE_PATTERN.test(href) || TEMPLATE_IMAGE_PATTERN.test(href) || /\/$/.test(href))
		.map(normalizeTemplatePath);
}

async function discoverTemplatePaths() {
	const entries = await fetchTemplateManifest(DESIGN_BLOCK_MANIFEST, true);

	const paths = await Promise.all(entries.map(expandTemplateManifestEntry));
	return paths.flat();
}

async function fetchTemplateManifest(url, required) {
	const response = await fetch(url, { cache: 'no-store' });
	const contentType = response.headers.get('content-type') || '';
	if (!response.ok || contentType.includes('text/html')) {
		if (required) throw new Error(`${url} 파일을 읽을 수 없습니다.`);
		return [];
	}
	try {
		const manifest = await response.json();
		return Array.isArray(manifest) ? manifest : (manifest.groups || []);
	} catch (e) {
		if (required) throw new Error(`${url} JSON 파싱 오류: ${e.message}`);
		return [];
	}
}

async function expandTemplateManifestEntry(entry) {
	if (typeof entry === 'string') {
		const path = normalizeTemplatePath(entry);
		const id = inferCntBuilderTemplateId(path);
		const category = inferCntBuilderTemplateCategory(path);
		if (id && category) {
			templateCategories[id] = category;
			templateBasePaths[id] = normalizeTemplateFolder(path.replace(/\/?index\.html$/i, '').replace(/\/[^/]+\.[^.]+$/i, ''));
		}
		return [path];
	}

	if (entry.type === 'image-set') {
		const groupBasePath = normalizeTemplateFolder(entry.path || entry.id);
		const config = await loadTemplateConfig(`${groupBasePath}/index.html`);
		return (config.images || []).map(image => {
			const path = normalizeTemplatePath(`${groupBasePath}/${image}`);
			const id = inferCntBuilderTemplateId(path);
			const category = inferCntBuilderTemplateCategory(path);
			if (id && category) {
				templateCategories[id] = category;
				templateBasePaths[id] = groupBasePath;
			}
			return path;
		});
	}

	const paths = [];
	const groupBasePath = normalizeTemplateFolder(entry.path || entry.id);
	for (const id of (entry.items || [])) {
		templateCategories[id] = entry.id;
		templateBasePaths[id] = `${groupBasePath}/${id}`;
		paths.push(`${groupBasePath}/${id}/index.html`);
	}
	return paths;
}

function getTemplateCssPath(htmlPath) {
	return htmlPath.replace(/[^/]+$/, 'style.css');
}

function getTemplateConfigPath(htmlPath) {
	return htmlPath.replace(/[^/]+$/, 'config.json');
}

async function loadTemplateConfig(htmlPath) {
	try {
		const res = await fetch(getTemplateConfigPath(htmlPath), { cache: 'no-store' });
		if (res.ok) return await res.json();
	} catch (e) {}
	return {};
}

function normalizeTemplateAssetPaths(element) {
	element.querySelectorAll('img[src]').forEach(img => {
		img.setAttribute('src', normalizeAssetPath(img.getAttribute('src')));
	});
	element.querySelectorAll('[style]').forEach(node => {
		const style = node.getAttribute('style');
		if (style && style.includes('url(')) {
			node.setAttribute('style', style.replace(/url\((['"]?)(\/?templates\/[^'")]+)\1\)/g, (_, quote, assetPath) => {
				return `url(${quote}${normalizeAssetPath(assetPath)}${quote})`;
			}));
		}
	});
}

function loadTemplateCss(htmlPath) {
	const cssPath = getTemplateCssPath(htmlPath);
	if (loadedTemplateStyles.has(cssPath)) return loadedTemplateStyles.get(cssPath);

	const promise = fetch(cssPath)
		.then(res => {
			if (!res.ok) return;
			return res.text();
		})
		.then(css => {
			if (!css || !css.trim()) return;
			if (!activeTemplateStylePaths.has(cssPath)) return;
			const style = document.createElement('style');
			style.setAttribute('data-template-style', cssPath);
			style.textContent = css;
			document.head.appendChild(style);
		})
		.catch(() => {});

	loadedTemplateStyles.set(cssPath, promise);
	return promise;
}

function collectTemplateStylePathsFromBlock(block, paths = new Set()) {
	const template = componentTemplates[block?.type];
	if (template?.hasStyle && template.path) {
		paths.add(getTemplateCssPath(template.path));
	}
	(block?.innerBlocks || []).forEach(innerBlock => collectTemplateStylePathsFromBlock(innerBlock, paths));
	(block?.items || []).forEach(item => {
		if (item?.listBlock) collectTemplateStylePathsFromBlock(item.listBlock, paths);
		(item?.innerBlocks || []).forEach(innerBlock => collectTemplateStylePathsFromBlock(innerBlock, paths));
	});
	Object.values(block?.tableCellInnerBlocks || {}).forEach(innerBlock => collectTemplateStylePathsFromBlock(innerBlock, paths));
	return paths;
}

function syncActiveTemplateStyles() {
	const nextPaths = new Set();
	state.blocks.forEach(block => collectTemplateStylePathsFromBlock(block, nextPaths));

	document.querySelectorAll('style[data-template-style]').forEach(style => {
		const cssPath = style.getAttribute('data-template-style');
		if (cssPath && !nextPaths.has(cssPath)) {
			style.remove();
		}
	});
	loadedTemplateStyles.forEach((_, cssPath) => {
		if (!nextPaths.has(cssPath)) loadedTemplateStyles.delete(cssPath);
	});

	activeTemplateStylePaths.clear();
	nextPaths.forEach(cssPath => {
		activeTemplateStylePaths.add(cssPath);
		loadTemplateCss(cssPath.replace(/style\.css$/i, 'index.html'));
	});
}

async function loadHtmlTemplate(path) {
	const response = await fetch(path, { cache: 'no-store' });
	if (!response.ok) throw new Error(`${path} 파일을 읽을 수 없습니다.`);
	const source = await response.text();
	const doc = new DOMParser().parseFromString(source, 'text/html');
	const element = doc.querySelector('[data-template-id]') || doc.body.firstElementChild;
	if (!element || element.tagName.toLowerCase() !== 'div') {
		throw new Error(`${path} 템플릿은 최상위 div가 필요합니다.`);
	}

	const id = element.dataset.templateId || path.split('/').pop().replace(/\.[^.]+$/, '');
	const name = element.dataset.templateName || id;
	element.dataset.templateId = id;
	normalizeTemplateAssetPaths(element);
	const hasStyle = element.dataset.hasStyle === 'true';
	const config = await loadTemplateConfig(path);

	const addRowWrap = element.querySelector('.add-row-wrap') || element;
	const autoDirection = addRowWrap === element ? 'row' : 'column';
	const addDirection = config.addDirection || autoDirection;
	const isRootWrap = addDirection === 'row';

	const max = Number(config.max) || 4;

	const editListEl = element.querySelector('.edit-list');
	const editListLiTemplate = editListEl ? editListEl.querySelector('li') : null;

	const styleOptions = config.styleOptions || null;
	const defaultInnerType = config.defaultInnerType || null;
	const cssVarDefaults = readCssVarDefaults(element);
	const recommend = config.recommend || null;
	const templateFilters = config.templateFilters || [];
	const blockRules = config.blockRules || null;
	const isInline = !!config.inline;
	const inlineHtml = config.inlineHtml || '';
	const isSmartInline = !!config.smartInline;
	const tabDefaults = config.tabDefaults || null;
	const accordionDefaults = config.accordionDefaults || null;
	const discloserDefaults = config.discloserDefaults || null;
	const initialBodyBlocks = config.initialBodyBlocks || [];
	const templateVars = config.templateVars || null;

	return {
		id,
		name,
		path,
		recommend,
		templateFilters,
		blockRules,
		isInline,
		inlineHtml,
		isSmartInline,
		tabDefaults,
		accordionDefaults,
		discloserDefaults,
		initialBodyBlocks,
		templateVars,
		hasStyle,
		element,
		addRowWrap,
		isRootWrap,
		addDirection,
		max,
		editListLiTemplate,
		styleOptions,
		defaultInnerType,
		cssVarDefaults,
		getDefaultData: () => getDefaultData(element),
		getDefaultStyle: () => readDefaultStyle(element),
		render: (block, item, columnIndex, editable = true) => elementToHtml(renderTemplateElement(componentTemplates[id], item, block, columnIndex, editable)),
		markup: item => htmlToLines(elementToHtml(renderTemplateElement(componentTemplates[id], item)))
	};
}

async function loadImageTemplate(path) {
	const id = inferCntBuilderTemplateId(path);
	const folder = path.split('/').filter(Boolean).at(-2) || id;
	const name = id;
	const element = document.createElement('div');
	element.className = folder;
	element.dataset.templateId = id;
	element.dataset.templateName = name;

	const img = document.createElement('img');
	img.className = `${folder}-char`;
	img.src = normalizeAssetPath(path);
	img.alt = '';
	element.appendChild(img);

	const [, config] = await Promise.all([loadTemplateCss(path), loadTemplateConfig(path)]);
	const addRowWrap = element.querySelector('.add-row-wrap') || element;
	const addDirection = config.addDirection || 'row';
	const styleOptions = config.styleOptions || null;
	const defaultInnerType = config.defaultInnerType || null;
	const cssVarDefaults = readCssVarDefaults(element);
	const recommend = config.recommend || null;
	const templateFilters = config.templateFilters || [];

	return {
		id,
		name,
		path,
		recommend,
		templateFilters,
		element,
		addRowWrap,
		isRootWrap: addDirection === 'row',
		addDirection,
		max: Number(config.max) || 1,
		editListLiTemplate: null,
		styleOptions,
		defaultInnerType,
		cssVarDefaults,
		getDefaultData: () => ({}),
		getDefaultStyle: () => readDefaultStyle(element),
		render: (block, item, columnIndex, editable = true) => elementToHtml(renderTemplateElement(componentTemplates[id], item, block, columnIndex, editable)),
		markup: item => htmlToLines(elementToHtml(renderTemplateElement(componentTemplates[id], item)))
	};
}

function readCssVarDefaults(element) {
	const el = element.cloneNode(false);
	el.style.cssText = 'visibility:hidden;position:absolute;pointer-events:none;left:-9999px;';
	document.body.appendChild(el);
	const c = getComputedStyle(el);
	const get = name => c.getPropertyValue(name).trim() || null;
	const map = {
		'--title-border': 'titleBorderColor',
		'--title-bg':     'titleBackgroundColor',
		'--title-text':   'titleTextColor',
		'--title-weight': 'titleFontWeight',
		'--body-border':  'bodyBorderColor',
		'--body-bg':      'bodyBackgroundColor',
		'--body-text':    'bodyTextColor',
		'--body-weight':  'bodyFontWeight',
	};
	const result = {};
	Object.entries(map).forEach(([cssVar, key]) => {
		const val = get(cssVar);
		if (val) result[key] = val;
	});
	document.body.removeChild(el);
	return result;
}

async function loadJsTemplate(path) {
	const before = new Set(Object.keys(componentTemplates));
	await import(`../${path}?v=${Date.now()}`);
	const added = Object.keys(componentTemplates).filter(id => !before.has(id));
	if (!added.length) throw new Error(`${path} 파일에서 템플릿이 등록되지 않았습니다.`);
}

window.registerDesignTemplate = function registerDesignTemplate(template) {
	if (!template || !template.id) return;
	componentTemplates[template.id] = template;
};

async function loadTemplates() {
	const paths = await discoverTemplatePaths();
	const htmlPaths = paths.filter(path => /\.html$/i.test(path));
	const imagePaths = paths.filter(path => TEMPLATE_IMAGE_PATTERN.test(path));
	const jsPaths = paths.filter(path => /\.js$/i.test(path));

	for (const path of htmlPaths) {
		const template = await loadHtmlTemplate(path);
		componentTemplates[template.id] = template;
		if ((templateCategories[template.id] || '') === 'design-template') {
			registerDesignTemplateSections(template);
		}
	}

	for (const path of imagePaths) {
		const template = await loadImageTemplate(path);
		componentTemplates[template.id] = template;
	}

	for (const path of jsPaths) {
		await loadJsTemplate(path);
	}
}

function applyStyleOptionsDefaults(style, styleOptions) {
	Object.keys(styleOptions).forEach(target => {
		const fields = styleOptions[target]?.fields;
		if (!fields) return;
		fields.forEach(f => {
			if (!f.key || f.default === undefined) return;
			const styleKey = `${target}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`;
			style[styleKey] = f.default;
		});
	});
}

function createStyleForType(type) {
	const template = componentTemplates[type];
	const style = {
		...createDefaultStyle(),
		...(template.cssVarDefaults || {}),
		...(template.getDefaultStyle ? template.getDefaultStyle() : {})
	};
	if (template.styleOptions) applyStyleOptionsDefaults(style, template.styleOptions);
	return style;
}

function createSectionTemplate(parentTemplate, sectionElement, index) {
	const id = `${parentTemplate.id}__section_${index + 1}`;
	const element = document.createElement('div');
	element.className = parentTemplate.element.className;
	element.dataset.templateId = id;
	element.dataset.templateName = `${parentTemplate.name} ${index + 1}`;
		element.appendChild(sectionElement.cloneNode(true));

	return {
		...parentTemplate,
		id,
		name: element.dataset.templateName,
		element,
		addRowWrap: element,
		isRootWrap: true,
		addDirection: 'row',
		max: 1,
		editListLiTemplate: null,
		getDefaultData: () => getDefaultData(element),
		getDefaultStyle: () => readDefaultStyle(element),
		render: (block, item, columnIndex, editable = true) => elementToHtml(renderTemplateElement(componentTemplates[id], item, block, columnIndex, editable)),
		markup: item => htmlToLines(elementToHtml(renderTemplateElement(componentTemplates[id], item)))
	};
}

function registerDesignTemplateSections(template) {
	const sections = Array.from(template.element.children).filter(child => child.nodeType === 1);
	template.designSectionTypes = sections.map((section, index) => {
		const sectionTemplate = createSectionTemplate(template, section, index);
		componentTemplates[sectionTemplate.id] = sectionTemplate;
		templateCategories[sectionTemplate.id] = 'design-template-section';
		templateBasePaths[sectionTemplate.id] = templateBasePaths[template.id];
		return sectionTemplate.id;
	});
}

function createBlock(type) {
	const template = componentTemplates[type];
	const defaultData = template.getDefaultData ? template.getDefaultData() : {};
	const isDesignTemplateSection = (templateCategories[type] || '') === 'design-template-section';
	const block = {
		id: `block-${state.nextBlockId++}`,
		type,
		columns: 1,
		columnMode: '1',
		marginTop: 0,
		marginBottom: isDesignTemplateSection ? 0 : 10,
		marginLeft: 0,
		marginRight: 0,
		blockIndent: false,
		blockWidth: template.element.firstElementChild?.tagName.toLowerCase() === 'a' ? 'auto'
			: (isDesignTemplateSection && template.templateFilters?.includes('newsletter') ? '750px' : ''),
		blockAlign: '',
		items: [{ ...cloneData(defaultData), style: createStyleForType(type) }]
	};
	// Mix container: initialize inner blocks.
	if (isMixContainer(type)) {
		block.innerBlocks = [];
	}
	// title-list block: initialize list-wrap state.
	if (templateCategories[type] === 'title-list' && template.element.querySelector('.list-wrap')) {
		block.useList = true;
		block.items.forEach(item => { item.listBlock = null; });
	}
	// list block: initialize row structure.
	if (templateCategories[type] === 'list') {
		ensureListRows(block);
	}
	// tab block: initialize tab items and columns.
	if (templateCategories[type] === 'tab' && template.tabDefaults) {
		block.tabItems = cloneData(template.tabDefaults.items);
		block.tabCols = template.tabDefaults.cols || '4';
		ensureTabActionDefaults(block);
	}
	// accordion block: initialize items and size.
	if (templateCategories[type] === 'accordion' && template.accordionDefaults) {
		block.accordionItems = cloneData(template.accordionDefaults.items);
		block.accordionSize = template.accordionDefaults.size || '';
	}
	// discloser block: initialize title and content.
	if (type === 'accordion-03' && template.discloserDefaults) {
		block.discloserTitle = template.discloserDefaults.title || 'Discloser';
		block.discloserContent = template.discloserDefaults.content || '';
	}
	// button block defaults.
	if (templateCategories[type] === 'button') {
		block.blockWidth = type === 'button-00' ? '' : 'auto';
		block.btnSize = '';
		block.btnOpenType = 'default';
		if (type === 'button-05' || type === 'button-06') {
			block.btnIcon = 'ri-external-link-line';
		}
		if (type === 'button-05') {
			block.btnIconPos = 'before';
		}
	}
	// table block defaults.
	if (templateCategories[type] === 'table') {
		initTableBlock(block);
		if (type === 'table-02') _initTableBlock02(block);
	}
	// process block defaults.
	if (templateCategories[type] === 'process') {
		block.columns = 4;
		block.items = [
			{ title: '단계 1', sub: '설명', style: createStyleForType(type), innerBlocks: [] },
			{ title: '단계 2', sub: '설명', style: createStyleForType(type), innerBlocks: [] },
			{ title: '단계 3', sub: '설명', style: createStyleForType(type), innerBlocks: [] },
			{ title: '단계 4', sub: '', style: createStyleForType(type), innerBlocks: [] }
		];
	}
	return block;
}

let _placementToastTimer = null;
function showPlacementToast(message, type = 'error') {
	let toast = document.getElementById('placementToast');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'placementToast';
		document.body.appendChild(toast);
	}
	toast.className = `placement-toast placement-toast--${type}`;
	toast.textContent = message;
	const canvas = document.querySelector('.canvas-wrapper');
	if (canvas) {
		const rect = canvas.getBoundingClientRect();
		toast.style.left = `${rect.left + rect.width / 2}px`;
		toast.style.top = `${rect.top + rect.height / 2}px`;
	}
	toast.classList.add('is-visible');
	clearTimeout(_placementToastTimer);
	_placementToastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function validateBlockPlacement(type, targetBlockId = null, position = 'after') {
	const template = componentTemplates[type];
	if (!template?.blockRules) return { valid: true };
	const rules = template.blockRules;

	if (rules.requiresPredecessorType) {
		const required = [].concat(rules.requiresPredecessorType);
		const insertIndex = targetBlockId
			? state.blocks.findIndex(b => b.id === targetBlockId) + (position === 'before' ? 0 : 1)
			: state.blocks.length;
		const precedingBlocks = state.blocks.slice(0, insertIndex);
		const exists = precedingBlocks.some(b => required.includes(b.type));
		if (!exists) {
			return {
				valid: false,
				message: rules.errorMessage || `이 블록은 ${required.join(', ')} 블록 하위에만 추가할 수 있습니다.`
			};
		}
	}

	if (rules.maxCount != null) {
		const existingCount = state.blocks.filter(b => b.type === type).length;
		if (existingCount >= rules.maxCount) {
			return {
				valid: false,
				message: rules.maxCountMsg || `이 블록은 최대 ${rules.maxCount}개까지만 배치할 수 있습니다.`
			};
		}
	}

	if (rules.discouraged) {
		return { valid: true, warning: rules.warningMessage };
	}

	return { valid: true };
}

function addBlock(type, targetBlockId = null, position = 'after') {
	const targetForValidation = (() => {
		if (!targetBlockId) return null;
		const tb = state.blocks.find(b => b.id === targetBlockId);
		return (tb && componentTemplates[tb.type]?.initialBodyBlocks?.length > 0)
			? null : targetBlockId;
	})();
	const validation = validateBlockPlacement(type, targetForValidation, position);
	if (!validation.valid) {
		showPlacementToast(validation.message, 'error');
		return;
	}
	if (validation.warning) {
		showPlacementToast(validation.warning, 'warning');
	}
	pushHistory();
	const block = createBlock(type);
	if (type === 'principal-tyB' && state.previewDevice === 'pc' && state.canvasWidth === '1024') {
		state.canvasWidth = '1241';
		document.body.dataset.canvasSize = state.canvasWidth;
		if (canvasGrid) canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	}

	const _hasSectionBody = (b) => b && componentTemplates[b.type]?.initialBodyBlocks?.length > 0;
	const targetBlock = targetBlockId ? state.blocks.find(b => b.id === targetBlockId) : null;

	let parentSection = null;
	if (targetBlock?._isNlBodyBlock && targetBlock?._parentSectionId) {
		parentSection = state.blocks.find(b => b.id === targetBlock._parentSectionId) || null;
	} else if (targetBlock && _hasSectionBody(targetBlock)) {
		parentSection = targetBlock;
	} else if (!targetBlockId) {
		const sections = state.blocks.filter(b => !b._isNlBodyBlock && _hasSectionBody(b));
		if (sections.length === 1) parentSection = sections[0];
	}

	if (parentSection) {
		block._isNlBodyBlock = true;
		block._parentSectionId = parentSection.id;
		block.marginBottom = 0;
		if (targetBlock?._isNlBodyBlock) {
			const targetIndex = state.blocks.findIndex(b => b.id === targetBlockId);
			state.blocks.splice(targetIndex + 1, 0, block);
		} else {
			const lastBodyIdx = state.blocks.reduce((acc, b, i) =>
				(b._isNlBodyBlock && b._parentSectionId === parentSection.id) ? i : acc, -1);
			if (lastBodyIdx >= 0) state.blocks.splice(lastBodyIdx + 1, 0, block);
			else state.blocks.push(block);
		}
	} else {
		const targetIndex = targetBlockId ? state.blocks.findIndex(b => b.id === targetBlockId) : -1;
		if (targetIndex >= 0) state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, block);
		else state.blocks.push(block);
	}

	render();
	const newEl = canvasGrid.querySelector(`[data-block-id="${block.id}"]`);
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	selectBlock(block.id);
	openBlockProps(block.id);
	if (type === 'table-03') {
		setTimeout(() => openTableDrawPopover(block.id), 0);
	}
}

function addDesignTemplate(type, targetBlockId = null, position = 'after') {
	const template = componentTemplates[type];
	const sectionTypes = template?.designSectionTypes || [];
	if (!sectionTypes.length) {
		addBlock(type, targetBlockId, position);
		return;
	}
	pushHistory();
	if (template.templateVars) {
		state.templateVars = { ...template.templateVars };
	}
	const blocks = sectionTypes.map(sectionType => createBlock(sectionType));
	const targetIndex = targetBlockId ? state.blocks.findIndex(item => item.id === targetBlockId) : -1;
	if (targetIndex >= 0) {
		state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, ...blocks);
	} else {
		state.blocks.push(...blocks);
	}
	if (template.initialBodyBlocks?.length) {
		let bodyParentBlock = null;
		for (let i = 0; i < sectionTypes.length; i++) {
			const secTemplate = componentTemplates[sectionTypes[i]];
			if (secTemplate?.element?.querySelector('[data-edit-field="body"]')) {
				bodyParentBlock = blocks[i];
				break;
			}
		}
		if (bodyParentBlock) {
			template.initialBodyBlocks.forEach(entry => {
				const bodyType = typeof entry === 'string' ? entry : entry.type;
				if (!componentTemplates[bodyType]) return;
				const bodyBlock = createBlock(bodyType);
				bodyBlock._isNlBodyBlock = true;
				bodyBlock._parentSectionId = bodyParentBlock.id;
				if (typeof entry === 'object') {
					bodyBlock.marginBottom = entry.marginBottom ?? 0;
					if (entry.marginTop != null) bodyBlock.marginTop = entry.marginTop;
					if (entry.marginLeft != null) bodyBlock.marginLeft = entry.marginLeft;
					if (entry.marginRight != null) bodyBlock.marginRight = entry.marginRight;
					if (entry.data) Object.assign(bodyBlock.items[0], entry.data);
					if (entry.listRows && templateCategories[bodyType] === 'list') {
						_applyInitialListRows(bodyBlock, entry.listRows);
					}
					if (entry.markerType && templateCategories[bodyType] === 'list') {
						bodyBlock.listMarkerType = entry.markerType;
					}
					if (entry.initialTableData && templateCategories[bodyType] === 'table') {
					const _tblData = entry.colCount != null
						? { colCount: entry.colCount, ...entry.initialTableData }
						: entry.initialTableData;
					_applyInitialTableData(bodyBlock, _tblData);
					}
					if (entry.slots && typeof entry.slots === 'object') {
						_applyInitialSlots(bodyBlock, entry.slots);
					}
					if (entry.children && Array.isArray(entry.children) && isMixContainer(bodyType)) {
						_applyInitialChildren(bodyBlock, entry.children);
					}
					if (entry.privacyIcons && Array.isArray(entry.privacyIcons) && bodyType === 'title-02') {
						bodyBlock.privacyIcons = entry.privacyIcons.slice();
					}
					if (entry.anchorId && bodyType === 'title-02') {
						bodyBlock.anchorId = entry.anchorId;
					}
					if (entry.isTocTable && templateCategories[bodyType] === 'table') {
						bodyBlock.isTocTable = true;
					}
					if (entry.pryTbl && templateCategories[bodyType] === 'table') {
						bodyBlock.pryTbl = true;
					}
				} else {
					bodyBlock.marginBottom = 0;
				}
				state.blocks.push(bodyBlock);
			});
		}
	}
	render();
	const firstBlock = blocks[0];
	const newEl = firstBlock ? canvasGrid.querySelector(`[data-block-id="${firstBlock.id}"]`) : null;
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	if (firstBlock) {
		selectBlock(firstBlock.id);
		openBlockProps(firstBlock.id);
	}
}

function moveBlock(blockId, targetBlockId = null, position = 'after') {
	if (blockId === targetBlockId) return;
	pushHistory();
	const currentIndex = state.blocks.findIndex(block => block.id === blockId);
	if (currentIndex < 0) return;
	const [block] = state.blocks.splice(currentIndex, 1);
	const targetIndex = targetBlockId ? state.blocks.findIndex(item => item.id === targetBlockId) : -1;
	if (targetIndex >= 0) state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, block);
	else state.blocks.push(block);
	render();
}

function insertBlockIntoTemplateField(parentBlockId, slotField, payload) {
	if (!parentBlockId || !slotField || !payload) return;
	const parentBlock = state.blocks.find(block => block.id === parentBlockId);
	if (!parentBlock) return;
	if (payload.startsWith('new-block:')) {
		const type = payload.replace('new-block:', '');
		if (!componentTemplates[type]) return;
		pushHistory();
		const child = createBlock(type);
		child._slotParentId = parentBlockId;
		child._slotField = slotField;
		child.marginBottom = 0;
		state.blocks.push(child);
		render();
		openBlockProps(child.id);
		return;
	}
	if (payload.startsWith('copy-block:')) {
		const source = state.blocks.find(block => block.id === payload.replace('copy-block:', ''));
		if (!source || source.id === parentBlockId) return;
		pushHistory();
		const child = cloneData(source);
		child.id = `block-${state.nextBlockId++}`;
		child._slotParentId = parentBlockId;
		child._slotField = slotField;
		delete child._isNlBodyBlock;
		delete child._parentSectionId;
		child.marginBottom = child.marginBottom ?? 0;
		state.blocks.push(child);
		render();
		openBlockProps(child.id);
		return;
	}
	if (payload.startsWith('existing-block:')) {
		const childId = payload.replace('existing-block:', '');
		if (childId === parentBlockId) return;
		const child = state.blocks.find(block => block.id === childId);
		if (!child) return;
		let cursor = parentBlock;
		while (cursor?._slotParentId) {
			if (cursor._slotParentId === childId) return;
			cursor = state.blocks.find(block => block.id === cursor._slotParentId);
		}
		pushHistory();
		child._slotParentId = parentBlockId;
		child._slotField = slotField;
		delete child._isNlBodyBlock;
		delete child._parentSectionId;
		child.marginBottom = child.marginBottom ?? 0;
		render();
		openBlockProps(child.id);
	}
}

function removeBlock(blockId) {
	pushHistory();
	if (state.selectedItem?.blockId === blockId) state.selectedItem = null;
	state.blocks = state.blocks.filter(block => block.id !== blockId);
	render();
}

function moveNlBodyBlock(blockId, refBlockId) {
	if (!blockId || blockId === refBlockId) return;
	const bodyBlock = state.blocks.find(b => b.id === blockId);
	if (!bodyBlock) return;
	pushHistory();
	state.blocks = state.blocks.filter(b => b.id !== blockId);
	if (refBlockId) {
		const refIdx = state.blocks.findIndex(b => b.id === refBlockId);
		if (refIdx >= 0) state.blocks.splice(refIdx, 0, bodyBlock);
		else state.blocks.push(bodyBlock);
	} else {
		state.blocks.push(bodyBlock);
	}
	render();
}

function convertAndInsertTitleBlock(payload, targetBlockId, demotedType) {
	pushHistory();
	const newTemplate = componentTemplates[demotedType];
	const newDefaultData = newTemplate?.getDefaultData ? newTemplate.getDefaultData() : {};

	if (payload.startsWith('new-block:') || payload.startsWith('new-design-template:')) {
		const block = createBlock(demotedType);
		const targetIndex = state.blocks.findIndex(b => b.id === targetBlockId);
		state.blocks.splice(targetIndex + 1, 0, block);
		render();
		const newEl = canvasGrid.querySelector(`[data-block-id="${block.id}"]`);
		if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		selectBlock(block.id);
	} else if (payload.startsWith('copy-block:')) {
		const srcBlock = state.blocks.find(b => b.id === payload.replace('copy-block:', ''));
		const block = createBlock(demotedType);
		if (srcBlock?.items?.[0]?.title !== undefined) {
			block.items[0].title = srcBlock.items[0].title;
		}
		const targetIndex = state.blocks.findIndex(b => b.id === targetBlockId);
		state.blocks.splice(targetIndex + 1, 0, block);
		render();
		const newEl = canvasGrid.querySelector(`[data-block-id="${block.id}"]`);
		if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		selectBlock(block.id);
	} else if (payload.startsWith('existing-block:')) {
		const blockId = payload.replace('existing-block:', '');
		if (blockId === targetBlockId) return;
		const movingBlock = state.blocks.find(b => b.id === blockId);
		if (!movingBlock) return;
		const savedTitle = movingBlock.items[0]?.title;
		movingBlock.type = demotedType;
		movingBlock.items = [{
			...cloneData(newDefaultData),
			title: savedTitle !== undefined ? savedTitle : (newDefaultData.title || ''),
			style: createStyleForType(demotedType)
		}];
		const currentIndex = state.blocks.findIndex(b => b.id === blockId);
		state.blocks.splice(currentIndex, 1);
		const targetIndex = state.blocks.findIndex(b => b.id === targetBlockId);
		state.blocks.splice(targetIndex + 1, 0, movingBlock);
		render();
		selectBlock(blockId);
	}
}


function getListDepthConfig(templateElement) {
	const ulClasses = [];
	const hasMarker = !!templateElement.querySelector('span.mrk');
	function collectClasses(ulEl, depth) {
		ulClasses[depth] = ulEl.className || '';
		for (const liEl of ulEl.querySelectorAll(':scope > li')) {
			const innerUl = liEl.querySelector(':scope > ul');
			if (innerUl) { collectClasses(innerUl, depth + 1); break; }
		}
	}
	const rootUl = templateElement.querySelector('ul');
	if (rootUl) collectClasses(rootUl, 0);
	return { ulClasses, hasMarker };
}

function parseListTemplateStructure(templateElement, item, prefix) {
	const rootUl = templateElement.querySelector('ul');
	if (!rootUl) return [];
	let n = 0;
	function parseUl(ulEl) {
		return Array.from(ulEl.querySelectorAll(':scope > li')).map(liEl => {
			const textSpan = Array.from(liEl.querySelectorAll(':scope > [data-edit-field]'))
				.find(s => !s.classList.contains('mrk'));
			const oldKey = textSpan?.dataset.editField;
			const newKey = `${prefix}r${n++}`;
			item[newKey] = oldKey && item[oldKey] !== undefined
				? item[oldKey]
				: (textSpan?.textContent?.trim() || '새 항목');
			const innerUl = liEl.querySelector(':scope > ul');
			return { key: newKey, children: innerUl ? parseUl(innerUl) : [] };
		});
	}
	return parseUl(rootUl);
}

function ensureListRows(block) {
	if (templateCategories[block.type] !== 'list') return;
	const template = componentTemplates[block.type];
	if (!template) return;
	const prefix = block.id.replace(/[^a-zA-Z0-9]/g, '_') + '_';
	block.items.forEach((item, idx) => {
		if (item.rows) return;
		item.rows = parseListTemplateStructure(template.element, item, `${prefix}${idx}_`);
	});
}

function renderListDynamically(block, item, columnIndex, templateElement, editable) {
	const config = getListDepthConfig(templateElement);
	const wrapDiv = document.createElement('div');
	const getTopMarkerText = idx => {
		if (block?.listMarkerType === 'num') return String(idx + 1);
		if (block?.listMarkerType === 'korean') {
			const markers = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
			return markers[idx] || `${markers[idx % markers.length]}${Math.floor(idx / markers.length) + 1}`;
		}
		return String.fromCharCode(65 + idx);
	};
	function buildUl(rows, depth) {
		if (!rows || !rows.length) return null;
		const ul = document.createElement('ul');
		if (config.ulClasses[depth]) ul.className = config.ulClasses[depth];
		rows.forEach((row, idx) => {
			const li = document.createElement('li');
			if (config.hasMarker && depth < config.ulClasses.length) {
				const mrk = document.createElement('span');
				mrk.className = 'mrk';
				mrk.textContent = depth === 0
					? getTopMarkerText(idx)
					: String(idx + 1).padStart(2, '0');
				li.appendChild(mrk);
			}
			// Render a block inserted into a list row.
			if (row.blockRef) {
				const rowText = item[row.key] || '';
				if (rowText) {
					if (editable && block) {
						const textSpan = document.createElement('span');
						setFieldContent(textSpan, rowText);
						textSpan.dataset.editField = row.key;
						textSpan.dataset.blockId = block.id;
						textSpan.dataset.columnIndex = String(columnIndex);
						textSpan.dataset.listRow = 'true';
						li.appendChild(textSpan);
					} else {
						li.insertAdjacentHTML('beforeend', rowText);
					}
				}
				const childBlock = state.blocks.find(b => b.id === row.blockRef);
				if (childBlock) {
					if (editable) {
						const childWrapper = document.createElement('div');
						childWrapper.className = 'nl-block-insert nl-body-block-wrap';
						childWrapper.dataset.nlBodyBlockId = childBlock.id;
						const mbPx = childBlock.marginBottom ?? 0;
						childWrapper.style.marginBottom = mbPx + 'px';
						const ctrlHtml = _innerBlockActionsHtml(
							'',
							`<button type="button" class="inner-block-btn inner-block-btn--remove" data-nl-body-delete-id="${childBlock.id}" title="삭제" aria-hidden="true"><i class="ri-delete-bin-line"></i></button>`
						);
						const childBlockHtml = renderRepeatedColumns(childBlock);
						childWrapper.innerHTML = ctrlHtml + (childBlock.blockIndent ? `<div class="indent">${childBlockHtml}</div>` : childBlockHtml);
						li.appendChild(childWrapper);
					} else {
						const childWrapper = document.createElement('div');
						const childBlockHtml = _renderBlockExportHtml(childBlock);
						childWrapper.innerHTML = childBlock.blockIndent ? `<div class="indent">${childBlockHtml}</div>` : childBlockHtml;
						li.appendChild(childWrapper);
					}
				}
			} else if (editable && block) {
				const textSpan = document.createElement('span');
				setFieldContent(textSpan, item[row.key] || '');
				textSpan.dataset.editField = row.key;
				textSpan.dataset.blockId = block.id;
				textSpan.dataset.columnIndex = String(columnIndex);
				textSpan.dataset.listRow = 'true';
				li.appendChild(textSpan);
			} else {
				li.insertAdjacentHTML('beforeend', item[row.key] || '');
			}
			if (editable && block) {
				li.style.position = 'relative';
				const maxDepth = config.ulClasses.length - 1;
				const canAddChild = depth < maxDepth;
				const canRemove = !(depth === 0 && rows.length <= 1);
				const actionsDiv = document.createElement('span');
				actionsDiv.className = 'list-row-inline-actions';
				const addBtn = document.createElement('button');
				addBtn.type = 'button';
				addBtn.className = 'list-row-inline-btn list-row-inline-btn--add';
				addBtn.title = '아래 행 추가';
				addBtn.dataset.blockId = block.id;
				addBtn.dataset.rowKey = row.key;
				addBtn.innerHTML = '<i class="ri-add-line" aria-hidden="true"></i>';
				actionsDiv.appendChild(addBtn);
				const childBtn = document.createElement('button');
				childBtn.type = 'button';
				childBtn.className = 'list-row-inline-btn list-row-inline-btn--child';
				childBtn.title = '하위 행 추가';
				childBtn.dataset.blockId = block.id;
				childBtn.dataset.rowKey = row.key;
				childBtn.innerHTML = '<i class="ri-corner-down-right-line" aria-hidden="true"></i>';
				if (!canAddChild) childBtn.disabled = true;
				actionsDiv.appendChild(childBtn);
				const removeBtn = document.createElement('button');
				removeBtn.type = 'button';
				removeBtn.className = 'list-row-inline-btn list-row-inline-btn--remove';
				removeBtn.title = '행 삭제';
				removeBtn.dataset.blockId = block.id;
				removeBtn.dataset.rowKey = row.key;
				removeBtn.innerHTML = '<i class="ri-delete-bin-line" aria-hidden="true"></i>';
				if (!canRemove) removeBtn.disabled = true;
				actionsDiv.appendChild(removeBtn);
				li.appendChild(actionsDiv);
			}
			if (row.children && row.children.length > 0) {
				const childUl = buildUl(row.children, depth + 1);
				if (childUl) li.appendChild(childUl);
			}
			ul.appendChild(li);
		});
		return ul;
	}
	const rootUl = buildUl(item.rows, 0);
	if (rootUl) wrapDiv.appendChild(rootUl);
	if (!editable) stripEditorAttributes(wrapDiv);
	return wrapDiv;
}

let _rowSeq = 0;

function _createSlotBlock(blockDef, parentId, slotField) {
	const type = blockDef.type;
	if (!componentTemplates[type]) return null;
	const child = createBlock(type);
	child._slotParentId = parentId;
	child._slotField = slotField;
	if (blockDef.data) Object.assign(child.items[0], blockDef.data);
	if (blockDef.marginBottom != null) child.marginBottom = blockDef.marginBottom;
	if (blockDef.marginTop != null) child.marginTop = blockDef.marginTop;
	if (blockDef.listRows && templateCategories[type] === 'list') {
		_applyInitialListRows(child, blockDef.listRows);
	}
	if (blockDef.markerType && templateCategories[type] === 'list') {
		child.listMarkerType = blockDef.markerType;
	}
	if (blockDef.initialTableData && templateCategories[type] === 'table') {
		const tblData = blockDef.colCount != null
			? { colCount: blockDef.colCount, ...blockDef.initialTableData }
			: blockDef.initialTableData;
		_applyInitialTableData(child, tblData);
	}
	if (blockDef.slots && typeof blockDef.slots === 'object') {
		_applyInitialSlots(child, blockDef.slots);
	}
	return child;
}

function _applyInitialSlots(block, slotsConfig) {
	Object.entries(slotsConfig).forEach(([field, blockDefs]) => {
		if (!Array.isArray(blockDefs)) return;
		blockDefs.forEach(blockDef => {
			const child = _createSlotBlock(blockDef, block.id, field);
			if (child) state.blocks.push(child);
		});
	});
}

// Initialize mix-inner-slot children into innerBlocks.
function _applyInitialChildren(block, children) {
	if (!Array.isArray(children) || !Array.isArray(block.innerBlocks)) return;
	children.forEach(childDef => {
		const childType = typeof childDef === 'string' ? childDef : childDef.type;
		if (!childType || !componentTemplates[childType]) return;
		const childTemplate = componentTemplates[childType];
		const childData = childTemplate.getDefaultData ? childTemplate.getDefaultData() : {};
		const ib = {
			type: childType,
			marginBottom: (typeof childDef === 'object' && childDef.marginBottom != null) ? childDef.marginBottom : 10,
			items: [{ ...cloneData(childData), style: createStyleForType(childType) }]
		};
		if (typeof childDef === 'object') {
			if (childDef.data) Object.assign(ib.items[0], childDef.data);
			if (childDef.marginTop != null) ib.marginTop = childDef.marginTop;
			if (childDef.marginLeft != null) ib.marginLeft = childDef.marginLeft;
			if (childDef.marginRight != null) ib.marginRight = childDef.marginRight;
		}
		if (templateCategories[childType] === 'list') {
			const fakeId = `${block.id}::inner::${block.innerBlocks.length}`;
			const fakeBlock = { id: fakeId, type: childType, items: ib.items };
			ensureListRows(fakeBlock);
			if (typeof childDef === 'object' && childDef.listRows) {
				_applyInitialListRows(fakeBlock, childDef.listRows);
			}
		}
		block.innerBlocks.push(ib);
	});
}

function _applyInitialListRows(block, rowDefs) {
	const item = block.items[0];
	if (!item) return;
	if (item.rows) {
		const clearRows = (rows) => {
			rows.forEach(row => {
				delete item[row.key];
				if (row.children?.length) clearRows(row.children);
			});
		};
		clearRows(item.rows);
	}
	item.rows = [];
	const build = (defs, stateRows) => {
		defs.forEach(def => {
			const newKey = _newRowKey(block);
			const row = { key: newKey, children: [] };
			stateRows.push(row);
			if (typeof def === 'string') {
				item[newKey] = def;
			} else if (typeof def === 'object' && def !== null) {
				item[newKey] = def.text || '';
				if (def.blockDef && def.blockDef.type) {
					const child = _createSlotBlock(def.blockDef, block.id, newKey);
					if (child) {
						state.blocks.push(child);
						row.blockRef = child.id;
					}
				}
				if (Array.isArray(def.children) && def.children.length) {
					build(def.children, row.children);
				}
			}
		});
	};
	build(rowDefs, item.rows);
}

function _newRowKey(block) {
	const prefix = block.id.replace(/[^a-zA-Z0-9]/g, '_');
	return `${prefix}_rX${_rowSeq++}`;
}

function _findListRow(block, rowKey) {
	const item = block.items[0];
	if (!item || !item.rows) return null;
	const find = (rows) => {
		for (const row of rows) {
			if (row.key === rowKey) return row;
			if (row.children?.length) {
				const found = find(row.children);
				if (found) return found;
			}
		}
		return null;
	};
	return find(item.rows);
}

function addListRowToBlock(blockId) {
	const block = resolveBlockForRows(blockId);
	if (!block) return;
	ensureListRows(block);
	pushHistory();
	block.items.forEach(item => {
		if (!item.rows) item.rows = [];
		const newKey = _newRowKey(block);
		item[newKey] = '새 항목';
		item.rows.push({ key: newKey, children: [] });
	});
	render();
}

function addSiblingRowToBlock(blockId, afterRowKey) {
	const block = resolveBlockForRows(blockId);
	if (!block) return;
	ensureListRows(block);
	pushHistory();
	block.items.forEach(item => {
		if (!item.rows) return;
		function insertAfter(rows) {
			for (let i = 0; i < rows.length; i++) {
				if (rows[i].key === afterRowKey) {
					const newKey = _newRowKey(block);
					item[newKey] = '새 항목';
					rows.splice(i + 1, 0, { key: newKey, children: [] });
					return true;
				}
				if (insertAfter(rows[i].children)) return true;
			}
			return false;
		}
		insertAfter(item.rows);
	});
	render();
}

function addChildRowToBlock(blockId, parentRowKey) {
	const block = resolveBlockForRows(blockId);
	if (!block) return;
	ensureListRows(block);
	pushHistory();
	block.items.forEach(item => {
		if (!item.rows) return;
		function findRow(rows) {
			for (const row of rows) {
				if (row.key === parentRowKey) return row;
				const found = findRow(row.children);
				if (found) return found;
			}
			return null;
		}
		const parent = findRow(item.rows);
		if (!parent) return;
		const newKey = _newRowKey(block);
		item[newKey] = '새 항목';
		parent.children.push({ key: newKey, children: [] });
	});
	render();
}

function removeListRowFromBlock(blockId, rowKey) {
	const block = resolveBlockForRows(blockId);
	if (!block) return;
	function findAndRemove(rows) {
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].key === rowKey) return rows.splice(i, 1)[0];
			const found = findAndRemove(rows[i].children);
			if (found) return found;
		}
		return null;
	}
	function collectKeys(row) {
		return [row.key, ...row.children.flatMap(collectKeys)];
	}
	pushHistory();
	block.items.forEach(item => {
		if (!item.rows) return;
		const removed = findAndRemove(item.rows);
		if (removed) collectKeys(removed).forEach(k => delete item[k]);
	});
	render();
}

function renderPropsListRows(block) {
	const container = document.getElementById('propsListRowsContainer');
	if (!container) return;
	const item = block.items[0];
	if (!item || !item.rows) { container.innerHTML = ''; return; }

	const template = componentTemplates[block.type];
	const maxDepth = template ? getListDepthConfig(template.element).ulClasses.length - 1 : 3;

	const flat = [];
	function flatten(rows, depth) {
		rows.forEach(row => {
			flat.push({ row, depth, siblings: rows });
			flatten(row.children, depth + 1);
		});
	}
	flatten(item.rows, 0);

	container.innerHTML = flat.map(({ row, depth, siblings }) => {
		const rawText = (item[row.key] || '').replace(/<[^>]+>/g, '').slice(0, 22) || '(빈 항목)';
		const canRemove = !(depth === 0 && siblings.length <= 1);
		const canAddChild = depth < maxDepth;
		return `<div class="props-list-row">
			<span class="props-list-row-indent" style="width:${depth * 12}px;flex-shrink:0"></span>
			<span class="props-list-row-dot"></span>
			<span class="props-list-row-text">${rawText}</span>
			<button type="button" class="props-list-row-add-btn" data-block-id="${block.id}" data-row-key="${row.key}" title="아래 행 추가">
				<i class="ri-add-line"></i>
			</button>
			<button type="button" class="props-list-row-child-btn" data-block-id="${block.id}" data-row-key="${row.key}" title="하위 행 추가"${canAddChild ? '' : ' disabled'}>
				<i class="ri-corner-down-right-line"></i>
			</button>
			<button type="button" class="props-list-row-remove-btn" data-block-id="${block.id}" data-row-key="${row.key}" title="삭제"${canRemove ? '' : ' disabled'}>
				<i class="ri-subtract-line"></i>
			</button>
		</div>`;
	}).join('');
}


let _tableRowSeq = 0;

function _newTableRowKey(block) {
	const prefix = block.id.replace(/[^a-zA-Z0-9]/g, '_');
	return `${prefix}_tr${_tableRowSeq++}`;
}

function initTableBlock(block) {
	block.tableColCount = 4;
	block.tableColWidthMode = 'auto';
	block.tableColWidths = ['25%', '25%', '25%', '25%'];
	block.tableHasThead = true;
	block.tableHasTbody = true;
	block.tableHasTfoot = false;

	const item = block.items[0];

	const r0 = _newTableRowKey(block);
	block.tableTheadRows = [{ key: r0, thAlign: '', tdAlign: '' }];
	for (let c = 0; c < 4; c++) item[`${r0}_c${c}`] = 'th';

	const r1 = _newTableRowKey(block);
	const r2 = _newTableRowKey(block);
	block.tableTbodyRows = [
		{ key: r1, thAlign: '', tdAlign: '', cellTags: Array(4).fill('td') },
		{ key: r2, thAlign: '', tdAlign: '', cellTags: Array(4).fill('td') }
	];
	for (let c = 0; c < 4; c++) item[`${r1}_c${c}`] = 'td';
	for (let c = 0; c < 4; c++) item[`${r2}_c${c}`] = 'td';

	block.tableTfootRows = [];
	if (!block.cellSpan) block.cellSpan = {};
	if (!block.tableScroll) block.tableScroll = '';
}

function _initTableBlock02(block) {
	const item = block.items[0];
	const colCount = 2;

	// thead 제거
	block.tableTheadRows.forEach(row => {
		for (let c = 0; c < 4; c++) delete item[`${row.key}_c${c}`];
	});
	block.tableHasThead = false;
	block.tableTheadRows = [];

	// 2컬럼 / 30:70 비율
	block.tableColCount = colCount;
	block.tableColWidthMode = 'manual';
	block.tableColWidths = ['30%', '70%'];

	// 기존 tbody 행을 th|td 구조로 전환
	block.tableTbodyRows.forEach(row => {
		delete item[`${row.key}_c2`];
		delete item[`${row.key}_c3`];
		item[`${row.key}_c0`] = 'th';
		item[`${row.key}_c1`] = 'td';
		row.cellTags = ['th', 'td'];
	});

	// 3번째 행 추가
	const r3 = _newTableRowKey(block);
	block.tableTbodyRows.push({ key: r3, cellTags: ['th', 'td'], thAlign: '', tdAlign: '' });
	item[`${r3}_c0`] = 'th';
	item[`${r3}_c1`] = 'td';

	block.tableBodyFirstCellTag = 'th';
}

function _applyInitialTableData(block, tableData) {
	const item = block.items[0];
	if (!item) return;
	const prevCol = block.tableColCount || 4;
	const colCount = tableData.colCount || prevCol;
	block.tableColCount = colCount;
	block.tableColWidths = Array(colCount).fill(`${Math.round(100 / colCount)}%`);
	block.tableColWidthMode = 'auto';
	const clearRows = (rows, oldCol) => {
		if (!rows) return;
		rows.forEach(row => {
			for (let c = 0; c < oldCol; c++) delete item[`${row.key}_c${c}`];
		});
	};
	clearRows(block.tableTheadRows, prevCol);
	clearRows(block.tableTbodyRows, prevCol);
	clearRows(block.tableTfootRows, prevCol);
	if (Array.isArray(tableData.colWidths) && tableData.colWidths.length === colCount) {
		block.tableColWidthMode = 'manual';
		block.tableColWidths = tableData.colWidths;
	}
	if (!block.cellSpan) block.cellSpan = {};
	const buildRows = (rowsData, isThead) => rowsData.map(rowEntry => {
		const cells = Array.isArray(rowEntry) ? rowEntry : (rowEntry.cells || []);
		const key = _newTableRowKey(block);
		const row = { key, thAlign: '', tdAlign: Array.isArray(rowEntry) ? '' : (rowEntry.tdAlign || '') };
		if (!isThead) row.cellTags = Array(colCount).fill('td');
		if (!isThead && !Array.isArray(rowEntry) && Array.isArray(rowEntry.privacyIcons)) {
			row.privacyIcons = rowEntry.privacyIcons.slice();
		}
		for (let c = 0; c < colCount; c++) {
			const cell = cells[c];
			if (cell === null || cell === undefined) {
				item[`${key}_c${c}`] = '';
			} else if (typeof cell === 'object') {
				item[`${key}_c${c}`] = cell.text ?? '';
				const rs = cell.rowspan || 1;
				const cs = cell.colspan || 1;
				if (rs > 1 || cs > 1) {
					block.cellSpan[`${key}_c${c}`] = { rowspan: rs, colspan: cs };
				}
				if (!isThead && cell.tag === 'th' && row.cellTags) {
					row.cellTags[c] = 'th';
				}
			} else {
				item[`${key}_c${c}`] = String(cell);
			}
		}
		return row;
	});
	if (tableData.thead?.length) {
		block.tableHasThead = true;
		block.tableTheadRows = buildRows(tableData.thead, true);
	} else {
		block.tableHasThead = false;
		block.tableTheadRows = [];
	}
	if (tableData.tbody?.length) {
		block.tableHasTbody = true;
		block.tableTbodyRows = buildRows(tableData.tbody, false);
	} else {
		block.tableTbodyRows = [];
	}
	if (tableData.tfoot?.length) {
		block.tableHasTfoot = true;
		block.tableTfootRows = buildRows(tableData.tfoot, false);
	} else {
		block.tableHasTfoot = false;
		block.tableTfootRows = [];
	}
}

function generateTableCaption(block, item) {
	const colCount = block.tableColCount || 4;
	let texts = [];

	if (block.tableHasThead && block.tableTheadRows && block.tableTheadRows.length > 0) {
		const row = block.tableTheadRows[0];
		for (let c = 0; c < colCount; c++) {
			const t = (item[`${row.key}_c${c}`] || '').replace(/<[^>]+>/g, '').trim();
			if (t) texts.push(t);
		}
	}

	if (texts.length === 0 && block.tableTbodyRows && block.tableTbodyRows.length > 0) {
		const row = block.tableTbodyRows[0];
		for (let c = 0; c < colCount; c++) {
			const t = (item[`${row.key}_c${c}`] || '').replace(/<[^>]+>/g, '').trim();
			if (t) texts.push(t);
		}
	}

	if (texts.length === 0) return '테이블 정보를 보여주는 테이블입니다.';
	return `${texts.join(', ')} 정보를 보여주는 테이블입니다.`;
}

function _computeTableHiddenCells(block, rows) {
	const hiddenCells = new Set();
	const colCount = block.tableColCount || 4;
	const cellSpan = block.cellSpan || {};
	rows.forEach((rowData, rowIdx) => {
		for (let c = 0; c < colCount; c++) {
			const cellKey = `${rowData.key}_c${c}`;
			if (hiddenCells.has(cellKey)) continue;
			const span = cellSpan[cellKey];
			if (!span) continue;
			const colspan = Math.min(Math.max(span.colspan || 1, 1), colCount - c);
			const rowspan = Math.min(Math.max(span.rowspan || 1, 1), rows.length - rowIdx);
			for (let dr = 0; dr < rowspan; dr++) {
				for (let dc = 0; dc < colspan; dc++) {
					if (dr === 0 && dc === 0) continue;
					const futureRow = rows[rowIdx + dr];
					if (!futureRow) continue;
					hiddenCells.add(`${futureRow.key}_c${c + dc}`);
				}
			}
		}
	});
	return hiddenCells;
}

function renderTableCellBlockSlots(cell, block, cellKey, editable) {
	getTableCellSlotKeys(block, cellKey).forEach(slotKey => {
		const innerBlockData = block.tableCellInnerBlocks?.[slotKey];
		if (innerBlockData) {
			const innerTemplate = componentTemplates[innerBlockData.type];
			if (!innerTemplate) return;
			const isListInner = templateCategories[innerBlockData.type] === 'list';
			const fakeBlock = { ...innerBlockData, id: `${block.id}::tcell::${slotKey}`, type: innerBlockData.type, columns: innerBlockData.columns || innerBlockData.items?.length || 1, items: innerBlockData.items };
			const zoneEl = document.createElement('div');
			zoneEl.className = 'table-cell-block-zone has-block';
			zoneEl.style.marginBottom = `${innerBlockData.marginBottom ?? 0}px`;
			if (editable) {
				const removeHtml = `<button type="button" class="table-cell-inner-remove inner-block-btn inner-block-btn--remove" data-block-id="${escapeAttr(block.id)}" data-cell-key="${escapeAttr(slotKey)}" title="블록 제거"><i class="ri-close-line"></i></button>`;
				zoneEl.insertAdjacentHTML('afterbegin', _innerBlockActionsHtml('', removeHtml));
				zoneEl.dataset.innerBlockId = `${block.id}::tcell::${slotKey}`;
			}
			let innerEl;
			if (isListInner && fakeBlock.items[0]?.rows) {
				innerEl = renderListDynamically(fakeBlock, fakeBlock.items[0], 0, innerTemplate.element, editable);
			} else {
				innerEl = buildColumnBlock(innerTemplate, fakeBlock, editable);
			}
			if (typeof innerEl === 'string') { zoneEl.innerHTML += innerEl; }
			else { zoneEl.appendChild(innerEl); }
			cell.appendChild(zoneEl);
			return;
		}

		const zoneEl = document.createElement('div');
		zoneEl.className = 'table-cell-block-zone is-empty';
		if (editable) {
			zoneEl.dataset.cellBlockZone = 'true';
			zoneEl.dataset.blockId = block.id;
			zoneEl.dataset.cellKey = slotKey;
		}
		zoneEl.innerHTML = '<div class="mix-slot-placeholder"><i class="ri-add-circle-line"></i> 디자인 블록을 드래그해 넣으세요.</div>';
		cell.appendChild(zoneEl);
	});
}

function _buildTableTr(block, item, rowData, sectionTag, editable, hiddenCells) {
	const tr = document.createElement('tr');
	const colCount = block.tableColCount || 4;
	const isThSection = sectionTag === 'thead' || sectionTag === 'tfoot';
	const cellSpan = block.cellSpan || {};

	for (let c = 0; c < colCount; c++) {
		const cellKey = `${rowData.key}_c${c}`;
		if (hiddenCells && hiddenCells.has(cellKey)) continue;
		// thead: always th; tfoot/tbody: respect per-cell cellTags
		const cellTag = sectionTag === 'thead' ? 'th' : (rowData.cellTags?.[c] || (sectionTag === 'tfoot' ? 'th' : 'td'));
		const alignVal = (rowData.cellAligns?.[c]) ?? (cellTag === 'th' ? (rowData.thAlign || '') : (rowData.tdAlign || ''));
		const vAlignVal = rowData.cellVAligns?.[c];
		const cell = document.createElement(cellTag);
		if (alignVal) cell.className = alignVal;
		if (vAlignVal) cell.style.verticalAlign = vAlignVal;
		if (cellTag === 'th') cell.setAttribute('scope', sectionTag === 'thead' ? 'col' : 'row');
		const span = cellSpan[cellKey];
		if (span?.colspan > 1) cell.setAttribute('colspan', String(span.colspan));
		if (span?.rowspan > 1) cell.setAttribute('rowspan', String(span.rowspan));

		const isBlockZone = !!(block.tableCellBlockZones?.[cellKey]);
		if (isBlockZone && editable) {
			cell.dataset.cellBlockZone = 'true';
			cell.dataset.blockId = block.id;
			cell.dataset.cellKey = cellKey;
		}

		if (isBlockZone) {
			renderTableCellBlockSlots(cell, block, cellKey, editable);
		} else {
			let cellHtml = applyTemplateVars(item[cellKey] || '');
			if (c === 0 && sectionTag !== 'thead' && Array.isArray(rowData.privacyIcons) && rowData.privacyIcons.length > 0) {
				const iconsHtml = rowData.privacyIcons.map(src =>
					`<img class="ico" style="width:1.75rem;flex-shrink:0;" src="${escapeAttr(src)}" onerror="this.style.display='none'" alt="" aria-hidden="true">`
				).join('');
				cellHtml = `<span style="display:flex;align-items:center;flex-wrap:wrap;gap:0.3rem;">${iconsHtml}<span>${cellHtml}</span></span>`;
			}
			cell.innerHTML = cellHtml;
		}

		if (editable) {
			cell.dataset.editField = cellKey;
			cell.dataset.blockId = block.id;
			cell.dataset.columnIndex = '0';
			cell.dataset.tableSection = sectionTag;
			cell.dataset.tableRowKey = rowData.key;
			cell.dataset.tableColIdx = String(c);
		}
		tr.appendChild(cell);
	}
	return tr;
}

function renderTableDynamically(block, item, columnIndex, editable) {
	const wrapper = document.createElement('div');
	const _hasRowTh = block.tableBodyFirstCellTag === 'th' ||
		(block.tableTbodyRows || []).some(r => r.cellTags?.[0] === 'th') ||
		(block.tableTfootRows || []).some(r => r.cellTags?.[0] === 'th');
	const _rowThClass = _hasRowTh ? ' row-th' : '';
	const _pryTblClass = block.pryTbl ? ' pryTbl' : '';
	wrapper.className = block.tableScroll ? `tbl-st ${block.tableScroll}${_rowThClass}${_pryTblClass}` : `tbl-st${_rowThClass}${_pryTblClass}`;

	const table = document.createElement('table');

	const caption = document.createElement('caption');
	caption.textContent = generateTableCaption(block, item);
	table.appendChild(caption);

	const colgroup = document.createElement('colgroup');
	const colCount = block.tableColCount || 4;
	if (block.tableColWidthMode === 'manual' && Array.isArray(block.tableColWidths) && block.tableColWidths.length === colCount) {
		block.tableColWidths.forEach(w => {
			const col = document.createElement('col');
			col.style.width = w;
			colgroup.appendChild(col);
		});
	} else {
		const col = document.createElement('col');
		col.setAttribute('span', String(colCount));
		col.style.width = `calc(100% / ${colCount})`;
		colgroup.appendChild(col);
	}
	table.appendChild(colgroup);

	if (block.tableHasThead && block.tableTheadRows && block.tableTheadRows.length) {
		const thead = document.createElement('thead');
		const theadHidden = _computeTableHiddenCells(block, block.tableTheadRows);
		block.tableTheadRows.forEach(row => thead.appendChild(_buildTableTr(block, item, row, 'thead', editable, theadHidden)));
		table.appendChild(thead);
	}

	if (block.tableHasTbody && block.tableTbodyRows && block.tableTbodyRows.length) {
		const tbody = document.createElement('tbody');
		const tbodyHidden = _computeTableHiddenCells(block, block.tableTbodyRows);
		block.tableTbodyRows.forEach(row => tbody.appendChild(_buildTableTr(block, item, row, 'tbody', editable, tbodyHidden)));
		table.appendChild(tbody);
	}

	if (block.tableHasTfoot && block.tableTfootRows && block.tableTfootRows.length) {
		const tfoot = document.createElement('tfoot');
		const tfootHidden = _computeTableHiddenCells(block, block.tableTfootRows);
		block.tableTfootRows.forEach(row => tfoot.appendChild(_buildTableTr(block, item, row, 'tfoot', editable, tfootHidden)));
		table.appendChild(tfoot);
	}

	wrapper.appendChild(table);
	if (block.tableScroll !== 'scroll-w' && block.tableScroll !== 'scroll-m') _injectTableDataLabels(table, block, item);
	if (!editable) stripEditorAttributes(wrapper);
	return wrapper;
}

function _injectTableDataLabels(table, block, item) {
	if (!block.tableHasThead || !block.tableTheadRows?.length) return;
	const colCount = block.tableColCount || 4;
	const headerRow = block.tableTheadRows[block.tableTheadRows.length - 1];
	const labels = [];
	for (let c = 0; c < colCount; c++) {
		const key = `${headerRow.key}_c${c}`;
		const raw = applyTemplateVars(item[key] || '');
		const tmp = document.createElement('div');
		tmp.innerHTML = raw;
		labels[c] = tmp.textContent.trim();
	}
	table.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
		let colIdx = 0;
		tr.querySelectorAll('th, td').forEach(cell => {
			if (cell.tagName === 'TD' && labels[colIdx]) cell.dataset.label = labels[colIdx];
			colIdx += parseInt(cell.getAttribute('colspan') || '1', 10);
		});
	});
}

function _addTableSection(block, sectionTag) {
	const hasKey = sectionTag === 'thead' ? 'tableHasThead' : sectionTag === 'tfoot' ? 'tableHasTfoot' : 'tableHasTbody';
	const rowsKey = sectionTag === 'thead' ? 'tableTheadRows' : sectionTag === 'tfoot' ? 'tableTfootRows' : 'tableTbodyRows';
	block[hasKey] = true;
	if (!block[rowsKey] || !block[rowsKey].length) {
		block[rowsKey] = [];
		_addTableRow(block, sectionTag);
	}
}

function _removeTableSection(block, sectionTag) {
	if (sectionTag === 'tbody') return;
	const hasKey = sectionTag === 'thead' ? 'tableHasThead' : 'tableHasTfoot';
	const rowsKey = sectionTag === 'thead' ? 'tableTheadRows' : 'tableTfootRows';
	const colCount = block.tableColCount || 4;
	const rows = block[rowsKey] || [];
	rows.forEach(row => {
		for (let c = 0; c < colCount; c++) {
			block.items.forEach(item => { delete item[`${row.key}_c${c}`]; });
			if (block.cellSpan) delete block.cellSpan[`${row.key}_c${c}`];
		}
	});
	block[hasKey] = false;
	block[rowsKey] = [];
}

function _addTableRow(block, sectionTag) {
	const rowsKey = sectionTag === 'thead' ? 'tableTheadRows' : sectionTag === 'tfoot' ? 'tableTfootRows' : 'tableTbodyRows';
	if (!block[rowsKey]) block[rowsKey] = [];
	const rowKey = _newTableRowKey(block);
	const rowInit = { key: rowKey, thAlign: '', tdAlign: '' };
	if (sectionTag === 'tbody') {
		rowInit.cellTags = Array(block.tableColCount || 4).fill('td');
		if (block.tableBodyFirstCellTag === 'th' && rowInit.cellTags.length > 0) rowInit.cellTags[0] = 'th';
	}
	block[rowsKey].push(rowInit);
	const colCount = block.tableColCount || 4;
	const defaultContent = sectionTag === 'tbody' ? 'td' : 'th';
	block.items.forEach(item => {
		for (let c = 0; c < colCount; c++) {
			const isRowTh = sectionTag === 'tbody' && block.tableBodyFirstCellTag === 'th' && c === 0;
			item[`${rowKey}_c${c}`] = isRowTh ? 'th' : defaultContent;
		}
	});
}

function _removeTableRow(block, sectionTag, rowKey) {
	const rowsKey = sectionTag === 'thead' ? 'tableTheadRows' : sectionTag === 'tfoot' ? 'tableTfootRows' : 'tableTbodyRows';
	const rows = block[rowsKey] || [];
	if (sectionTag === 'tbody' && rows.length <= 1) return;
	const idx = rows.findIndex(r => r.key === rowKey);
	if (idx < 0) return;
	rows.splice(idx, 1);
	const colCount = block.tableColCount || 4;
	block.items.forEach(item => {
		for (let c = 0; c < colCount; c++) delete item[`${rowKey}_c${c}`];
	});
	if (block.cellSpan) {
		for (let c = 0; c < colCount; c++) delete block.cellSpan[`${rowKey}_c${c}`];
	}
}

function _clearTableCellExtras(block, cellKey) {
	if (block.cellSpan) delete block.cellSpan[cellKey];
	if (block.tableCellBlockZones) {
		Object.keys(block.tableCellBlockZones).forEach(key => {
			if (key === cellKey || key.startsWith(`${cellKey}__slot`)) delete block.tableCellBlockZones[key];
		});
	}
	if (block.tableCellInnerBlocks) {
		Object.keys(block.tableCellInnerBlocks).forEach(key => {
			if (key === cellKey || key.startsWith(`${cellKey}__slot`)) delete block.tableCellInnerBlocks[key];
		});
	}
}

function _syncTableCellKeys(block, oldCount, newCount) {
	const sectionDefs = [
		{ rowsKey: 'tableTheadRows', sectionTag: 'thead' },
		{ rowsKey: 'tableTbodyRows', sectionTag: 'tbody' },
		{ rowsKey: 'tableTfootRows', sectionTag: 'tfoot' }
	];
	sectionDefs.forEach(({ rowsKey, sectionTag }) => {
		const rows = block[rowsKey] || [];
		const defaultContent = sectionTag === 'tbody' ? 'td' : 'th';
		rows.forEach(row => {
			if (newCount > oldCount) {
				block.items.forEach(item => {
					for (let c = oldCount; c < newCount; c++) item[`${row.key}_c${c}`] = defaultContent;
				});
				if (sectionTag === 'tbody') {
					if (!row.cellTags) row.cellTags = Array(oldCount).fill('td');
					for (let c = oldCount; c < newCount; c++) row.cellTags.push('td');
				}
			} else {
				block.items.forEach(item => {
					for (let c = newCount; c < oldCount; c++) delete item[`${row.key}_c${c}`];
				});
				for (let c = newCount; c < oldCount; c++) _clearTableCellExtras(block, `${row.key}_c${c}`);
				if (sectionTag === 'tbody' && row.cellTags) {
					row.cellTags = row.cellTags.slice(0, newCount);
				}
			}
		});
	});
}

function applyTableSize(block, colCount, bodyRowCount) {
	const nextCols = Math.max(1, Math.min(12, Number(colCount) || 1));
	const nextRows = Math.max(1, Math.min(10, Number(bodyRowCount) || 1));
	const oldCount = block.tableColCount || 4;
	if (nextCols !== oldCount) {
		block.tableColCount = nextCols;
		block.tableColWidths = Array.from({ length: nextCols }, () => `${Math.round(100 / nextCols)}%`);
		if (block.tableColWidthMode === 'manual') block.tableColWidthMode = 'auto';
		_syncTableCellKeys(block, oldCount, nextCols);
	}
	block.tableHasTbody = true;
	if (!block.tableTbodyRows) block.tableTbodyRows = [];
	while (block.tableTbodyRows.length < nextRows) _addTableRow(block, 'tbody');
	while (block.tableTbodyRows.length > nextRows) {
		const row = block.tableTbodyRows[block.tableTbodyRows.length - 1];
		if (!row) break;
		for (let c = 0; c < (block.tableColCount || nextCols); c++) _clearTableCellExtras(block, `${row.key}_c${c}`);
		_removeTableRow(block, 'tbody', row.key);
	}
}

function _renderTableSectionRows(block, sectionTag, rows) {
	if (!rows || !rows.length) return '';
	const colCount = block.tableColCount || 4;
	return `<div class="props-table-mini" style="--props-table-cols:${colCount + 1}">${rows.map((row, idx) => {
		const removeDisabled = sectionTag === 'tbody' && rows.length <= 1;
		const cellTags = row.cellTags || [];
		const rowControls = `<span class="props-table-mini-cell props-table-row-control-cell">
			<button type="button" class="props-list-row-remove-btn props-table-tr-remove-btn" data-block-id="${block.id}" data-section="${sectionTag}" data-row-key="${row.key}" title="삭제"${removeDisabled ? ' disabled' : ''}><i class="ri-subtract-line"></i></button>
		</span>`;
		const cells = Array.from({ length: colCount }, (_, c) => {
			const cellKey = `${row.key}_c${c}`;
			// thead: always th, no toggle
			if (sectionTag === 'thead') {
				return `<span class="props-table-mini-cell is-th" title="${cellKey}"><span class="props-mini-cell-tag">th</span></span>`;
			}
			// tfoot / tbody
			const defaultTag = sectionTag === 'tfoot' ? 'th' : 'td';
			const t = cellTags[c] || defaultTag;
			const isBlockZone = !!(block.tableCellBlockZones?.[cellKey]);
			const hasInner = !!(block.tableCellInnerBlocks?.[cellKey]);
			// tbody td: tag toggle btn + zone toggle btn
			if (sectionTag === 'tbody' && t === 'td') {
				return `<div class="props-table-mini-cell${isBlockZone ? ' is-block-zone' : ''}" title="${cellKey}">
					<button type="button" class="props-mini-cell-tag-btn props-table-cell-tag-btn" data-block-id="${block.id}" data-row-key="${row.key}" data-col-idx="${c}" data-section="tbody" title="th/td 전환">td</button>
					<button type="button" class="props-mini-cell-zone-btn${isBlockZone ? ' is-active' : ''}" data-block-id="${block.id}" data-row-key="${row.key}" data-col-idx="${c}" data-cell-key="${cellKey}" title="디자인블록으로 변경${isBlockZone ? ' (해제)' : ''}"><i class="ri-layout-grid-line" aria-hidden="true"></i></button>
				</div>`;
			}
			// tfoot or tbody th: single toggle button
			return `<button type="button" class="props-table-mini-cell is-th props-table-cell-tag-btn" data-block-id="${block.id}" data-row-key="${row.key}" data-col-idx="${c}" data-section="${sectionTag}" title="th/td 전환"><span class="props-mini-cell-tag">${t}</span></button>`;
		}).join('');
		return `<div class="props-table-mini-row">
			<div class="props-table-mini-cells">${rowControls}${cells}</div>
		</div>`;
	}).join('')}</div>`;
}

function _renderTableSectionAlignControls(block, sectionTag, rows) {
	if (!rows || !rows.length) return '';
	const getSharedAlign = () => {
		const first = rows[0]?.thAlign || '';
		const sameTh = rows.every(row => (row.thAlign || '') === first);
		if (sectionTag !== 'tbody') return sameTh ? first : '';
		const sameTd = rows.every(row => (row.tdAlign || '') === first);
		return sameTh && sameTd ? first : '';
	};
	const currentAlign = getSharedAlign();
	const alignBtnGroup = ['al', 'ac', 'ar'].map(a => `<button type="button" class="props-table-align-btn${currentAlign === a ? ' is-active' : ''}" data-block-id="${block.id}" data-section="${sectionTag}" data-row-key="__all__" data-cell-type="all" data-align="${a}" title="${a === 'al' ? '왼쪽' : a === 'ac' ? '중앙' : '오른쪽'}"><i class="ri-align-${a === 'al' ? 'left' : a === 'ac' ? 'center' : 'right'}"></i></button>`).join('');
	return `<div class="props-table-row-aligns props-table-section-aligns">
		<div class="props-table-align-btns"><span class="props-table-align-label">정렬</span>${alignBtnGroup}</div>
	</div>`;
}

function renderTableSizePicker(block) {
	const cols = 12;
	const rows = 10;
	const currentCols = Math.max(1, Math.min(cols, block.tableColCount || 4));
	const currentRows = Math.max(1, Math.min(rows, block.tableTbodyRows?.length || 1));
	const cells = [];
	for (let r = 1; r <= rows; r++) {
		for (let c = 1; c <= cols; c++) {
			const active = r <= currentRows && c <= currentCols;
			cells.push(`<button type="button" class="props-table-size-cell${active ? ' is-active' : ''}" data-table-cols="${c}" data-table-rows="${r}" aria-label="${c} x ${r}"></button>`);
		}
	}
	return `<div class="props-table-size-picker" data-current-cols="${currentCols}" data-current-rows="${currentRows}">
		<div class="props-table-size-grid" style="--props-table-size-cols:${cols}">${cells.join('')}</div>
		<div class="props-table-size-label"><span data-table-size-label>${currentCols} x ${currentRows}</span></div>
	</div>`;
}

function closeTableDrawPopover() {
	document.getElementById('tableDrawPopover')?.remove();
}

function openTableDrawPopover(blockId) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || templateCategories[block.type] !== 'table') return;
	closeTableDrawPopover();
	const popover = document.createElement('div');
	popover.id = 'tableDrawPopover';
	popover.className = 'table-draw-popover';
	popover.innerHTML = `
		<div class="table-draw-popover-panel">
			<div class="table-draw-popover-head">
				<strong>테이블 그리기</strong>
				<button type="button" class="table-draw-close" data-table-draw-close title="닫기" aria-label="닫기"><i class="ri-close-line" aria-hidden="true"></i></button>
			</div>
			${renderTableSizePicker(block)}
		</div>`;
	document.body.appendChild(popover);

	const panel = popover.querySelector('.table-draw-popover-panel');
	const target = canvasGrid?.querySelector(`[data-block-id="${blockId}"]`);
	if (panel && target) {
		const rect = target.getBoundingClientRect();
		const panelRect = panel.getBoundingClientRect();
		const left = Math.min(window.innerWidth - panelRect.width - 12, Math.max(12, rect.left + rect.width / 2 - panelRect.width / 2));
		const top = Math.min(window.innerHeight - panelRect.height - 12, Math.max(12, rect.top + 16));
		panel.style.left = `${left}px`;
		panel.style.top = `${top}px`;
	}

	popover.addEventListener('click', event => {
		if (event.target === popover || event.target.closest('[data-table-draw-close]')) {
			closeTableDrawPopover();
			return;
		}
		const sizeCell = event.target.closest('.props-table-size-cell');
		if (!sizeCell) return;
		const editableBlock = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
		if (!editableBlock) return;
		pushHistory();
		applyTableSize(editableBlock, parseInt(sizeCell.dataset.tableCols, 10), parseInt(sizeCell.dataset.tableRows, 10));
		closeTableDrawPopover();
		render();
		selectBlock(blockId);
		renderPropsTableSection(editableBlock);
	});

	popover.addEventListener('mouseover', event => {
		const sizeCell = event.target.closest('.props-table-size-cell');
		if (!sizeCell) return;
		const picker = sizeCell.closest('.props-table-size-picker');
		if (!picker) return;
		const cols = parseInt(sizeCell.dataset.tableCols, 10);
		const rows = parseInt(sizeCell.dataset.tableRows, 10);
		picker.querySelectorAll('.props-table-size-cell').forEach(cell => {
			const c = parseInt(cell.dataset.tableCols, 10);
			const r = parseInt(cell.dataset.tableRows, 10);
			cell.classList.toggle('is-hovered', c <= cols && r <= rows);
		});
		const label = picker.querySelector('[data-table-size-label]');
		if (label) label.textContent = `${cols} x ${rows}`;
	});

	popover.addEventListener('mouseout', event => {
		const picker = event.target.closest?.('.props-table-size-picker');
		if (!picker || picker.contains(event.relatedTarget)) return;
		const currentCols = parseInt(picker.dataset.currentCols, 10) || 1;
		const currentRows = parseInt(picker.dataset.currentRows, 10) || 1;
		picker.querySelectorAll('.props-table-size-cell').forEach(cell => cell.classList.remove('is-hovered'));
		const label = picker.querySelector('[data-table-size-label]');
		if (label) label.textContent = `${currentCols} x ${currentRows}`;
	});
}

function renderPropsTableStructure(block) {
	const container = document.getElementById('propsTableStructure');
	if (!container) return;

	const sections = [
		{ tag: 'thead', hasKey: 'tableHasThead', rowsKey: 'tableTheadRows', canRemove: true },
		{ tag: 'tbody', hasKey: 'tableHasTbody', rowsKey: 'tableTbodyRows', canRemove: false },
		{ tag: 'tfoot', hasKey: 'tableHasTfoot', rowsKey: 'tableTfootRows', canRemove: true }
	].filter(s => !(s.tag === 'thead' && block.tableBodyFirstCellTag === 'th'));

	container.innerHTML = sections.map(({ tag, hasKey, rowsKey, canRemove }) => {
		const hasSection = !!block[hasKey];
		const rows = block[rowsKey] || [];

		if (!hasSection) {
			return `<div class="props-table-section-wrap">
				<div class="props-table-outer-heading">
					<p class="props-section-label props-table-outer-label">${tag}</p>
				</div>
				<div class="props-table-section-empty props-table-section-box">
					<button type="button" class="props-add-row-btn props-table-add-section-btn" data-block-id="${block.id}" data-section="${tag}">
						<i class="ri-add-line" aria-hidden="true"></i> 사용 O
					</button>
				</div>
			</div>`;
		}

		return `<div class="props-table-section-wrap">
			<div class="props-table-outer-heading">
				<p class="props-section-label props-table-outer-label">${tag}</p>
				${canRemove ? `<button type="button" class="props-table-title-text-btn props-table-remove-section-btn" data-block-id="${block.id}" data-remove-section="${tag}">사용 X</button>` : ''}
				${_renderTableSectionAlignControls(block, tag, rows)}
			</div>
			<div class="props-table-section-group props-table-section-box">
				${_renderTableSectionRows(block, tag, rows)}
				<div class="props-table-bottom-actions">
					<button type="button" class="props-table-bottom-btn" data-block-id="${block.id}" data-add-tr="${tag}">
						<i class="ri-add-line" aria-hidden="true"></i> 행 추가
					</button>
				</div>
			</div>
		</div>`;
	}).join('');
}

function renderPropsTableSection(block) {
	const colCountInput = document.getElementById('propTableColCount');
	const colWidthModeSelect = document.getElementById('propTableColWidthMode');
	const colWidthsCard = document.getElementById('propsTableColWidthsCard');
	const colWidthsContainer = document.getElementById('propsTableColWidthsContainer');
	const notice = document.getElementById('propsTableColWidthsNotice');

	if (colCountInput) colCountInput.value = block.tableColCount || 4;
	if (colWidthModeSelect) colWidthModeSelect.value = block.tableColWidthMode || 'auto';
	const scrollSelect = document.getElementById('propTableScroll');
	if (scrollSelect) scrollSelect.value = block.tableScroll || '';

	const isManual = block.tableColWidthMode === 'manual';
	if (colWidthsCard) colWidthsCard.style.display = isManual ? '' : 'none';
	if (notice) notice.style.display = 'none';

	if (isManual && colWidthsContainer) {
		const colCount = block.tableColCount || 4;
		const widths = Array.isArray(block.tableColWidths) && block.tableColWidths.length === colCount
			? block.tableColWidths
			: Array(colCount).fill('');
		colWidthsContainer.innerHTML = Array.from({ length: colCount }, (_, i) => `
			<div class="props-row${i === colCount - 1 ? ' props-row--last' : ''}">
				<span class="props-label">열 ${i + 1}</span>
				<div class="props-input-unit">
					<input type="text" class="props-input props-table-col-width-input" style="width:4rem" data-col-idx="${i}" placeholder="예: 25" value="${escapeAttr((widths[i] || '').replace('%', ''))}">
					<span class="props-unit">%</span>
				</div>
			</div>`).join('');
	}

	renderPropsTableStructure(block);
}

function getTableRowsKey(sectionTag) {
	return sectionTag === 'thead' ? 'tableTheadRows' : sectionTag === 'tfoot' ? 'tableTfootRows' : 'tableTbodyRows';
}

let _tableCellPopoverInfo = null;
let _tableCellDragEventsBound = false;
let _tableSelection = null;
let _tableContextTarget = null;

function openTableCellSpanPopover(cell) {
	if (document.body.classList.contains('preview-mode')) return;
	const blockId = cell.dataset.blockId;
	const cellKey = cell.dataset.editField;
	const sectionTag = cell.dataset.tableSection;
	if (!blockId || !cellKey || !sectionTag) return;

	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;

	if (!block.cellSpan) block.cellSpan = {};
	const span = block.cellSpan[cellKey] || {};

	const rowsKey = sectionTag === 'thead' ? 'tableTheadRows' : sectionTag === 'tfoot' ? 'tableTfootRows' : 'tableTbodyRows';
	const rows = block[rowsKey] || [];
	const rowKey = cell.dataset.tableRowKey;
	const rowIdx = rows.findIndex(r => r.key === rowKey);
	const colCount = block.tableColCount || 4;
	const parts = cellKey.split('_c');
	const colIdx = parseInt(parts[parts.length - 1]);
	const maxColspan = colCount - colIdx;
	const maxRowspan = rows.length - rowIdx;

	const popover = document.getElementById('tableCellSpanPopover');
	if (!popover) return;

	const colspanInput = document.getElementById('tableCellColspan');
	const rowspanInput = document.getElementById('tableCellRowspan');
	if (colspanInput) { colspanInput.value = span.colspan || 1; colspanInput.max = String(maxColspan); }
	if (rowspanInput) { rowspanInput.value = span.rowspan || 1; rowspanInput.max = String(maxRowspan); }

	_tableCellPopoverInfo = { blockId, cellKey };

	const rect = cell.getBoundingClientRect();
	const popW = 180;
	let left = rect.left;
	if (left + popW > window.innerWidth - 10) left = window.innerWidth - popW - 10;
	let top = rect.top - 120;
	if (top < 8) top = rect.bottom + 6;

	popover.style.left = `${left}px`;
	popover.style.top = `${top}px`;
	popover.style.display = 'block';
}

function closeTableCellSpanPopover() {
	const popover = document.getElementById('tableCellSpanPopover');
	if (popover) popover.style.display = 'none';
	_tableCellPopoverInfo = null;
}

function applyTableCellSpan() {
	if (!_tableCellPopoverInfo) return;
	const { blockId, cellKey } = _tableCellPopoverInfo;
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;

	const colspan = Math.max(1, parseInt(document.getElementById('tableCellColspan')?.value) || 1);
	const rowspan = Math.max(1, parseInt(document.getElementById('tableCellRowspan')?.value) || 1);

	if (!block.cellSpan) block.cellSpan = {};
	if (colspan === 1 && rowspan === 1) {
		delete block.cellSpan[cellKey];
	} else {
		block.cellSpan[cellKey] = { colspan, rowspan };
	}

	pushHistory();
	closeTableCellSpanPopover();
	render();
}

function getTableCellDragInfo(cell) {
	const blockId = cell.dataset.blockId;
	const cellKey = cell.dataset.editField;
	const sectionTag = cell.dataset.tableSection;
	const rowKey = cell.dataset.tableRowKey;
	const colIdx = parseInt(cell.dataset.tableColIdx, 10);
	if (!blockId || !cellKey || !sectionTag || !rowKey || Number.isNaN(colIdx)) return null;

	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return null;
	const rows = block[getTableRowsKey(sectionTag)] || [];
	const rowIdx = rows.findIndex(row => row.key === rowKey);
	if (rowIdx < 0) return null;
	return { block, blockId, cellKey, sectionTag, rowKey, rowIdx, colIdx };
}

function clearTableDragRange() {
	document.querySelectorAll('.is-table-drag-range').forEach(cell => cell.classList.remove('is-table-drag-range'));
}

function closeTableContextMenu(clearSelection = false) {
	const menu = document.getElementById('tableContextMenu');
	if (menu) menu.style.display = 'none';
	if (clearSelection) {
		_tableSelection = null;
		_tableContextTarget = null;
		clearTableDragRange();
	}
}

function getTableSelectionBounds(start, end) {
	if (!start || !end || start.blockId !== end.blockId || start.sectionTag !== end.sectionTag) return null;
	const minRow = Math.min(start.rowIdx, end.rowIdx);
	const maxRow = Math.max(start.rowIdx, end.rowIdx);
	const minCol = Math.min(start.colIdx, end.colIdx);
	const maxCol = Math.max(start.colIdx, end.colIdx);
	const rows = start.block[getTableRowsKey(start.sectionTag)] || [];
	const topLeftRow = rows[minRow];
	if (!topLeftRow) return null;
	return {
		block: start.block,
		blockId: start.blockId,
		sectionTag: start.sectionTag,
		rows,
		minRow,
		maxRow,
		minCol,
		maxCol,
		topLeftKey: `${topLeftRow.key}_c${minCol}`,
		colspan: maxCol - minCol + 1,
		rowspan: maxRow - minRow + 1,
		cellCount: (maxRow - minRow + 1) * (maxCol - minCol + 1)
	};
}

function updateTableDragRange(targetCell) {
	const drag = state.tableCellDrag;
	const target = targetCell ? getTableCellDragInfo(targetCell) : null;
	if (!drag || !target) return;
	if (drag.blockId !== target.blockId || drag.sectionTag !== target.sectionTag) return;

	drag.end = target;
	drag.moved = drag.moved || drag.start.rowIdx !== target.rowIdx || drag.start.colIdx !== target.colIdx;
	clearTableDragRange();

	const minRow = Math.min(drag.start.rowIdx, target.rowIdx);
	const maxRow = Math.max(drag.start.rowIdx, target.rowIdx);
	const minCol = Math.min(drag.start.colIdx, target.colIdx);
	const maxCol = Math.max(drag.start.colIdx, target.colIdx);
	const table = targetCell.closest('table');
	if (!table) return;

	table.querySelectorAll(`[data-block-id="${CSS.escape(drag.blockId)}"][data-table-section="${drag.sectionTag}"]`).forEach(cell => {
		const info = getTableCellDragInfo(cell);
		if (!info) return;
		if (info.rowIdx >= minRow && info.rowIdx <= maxRow && info.colIdx >= minCol && info.colIdx <= maxCol) {
			cell.classList.add('is-table-drag-range');
		}
	});
}

function startTableCellDrag(cell, event) {
	const start = getTableCellDragInfo(cell);
	if (!start) return;
	closeTableContextMenu(false);
	_tableSelection = null;
	_tableContextTarget = null;
	state.tableCellDrag = { start, end: start, blockId: start.blockId, sectionTag: start.sectionTag, moved: false };
	clearTableDragRange();
	cell.classList.add('is-table-drag-range');
	event.preventDefault();
	event.stopPropagation();
	document.body.classList.add('is-table-cell-dragging');
	closeTableCellSpanPopover();
}

function applyTableMerge(selection = _tableSelection) {
	if (!selection || selection.cellCount < 2) return;
	const { block, rows, minRow, maxRow, minCol, maxCol, topLeftKey, colspan, rowspan } = selection;

	if (!block.cellSpan) block.cellSpan = {};
	pushHistory();
	for (let r = minRow; r <= maxRow; r++) {
		const row = rows[r];
		if (!row) continue;
		for (let c = minCol; c <= maxCol; c++) {
			delete block.cellSpan[`${row.key}_c${c}`];
		}
	}
	block.cellSpan[topLeftKey] = { colspan, rowspan };
	closeTableContextMenu(true);
	render();
}

function splitTableCell(selection = _tableSelection) {
	if (!selection) return;
	const span = selection.block.cellSpan?.[selection.topLeftKey];
	if (!span || ((span.colspan || 1) <= 1 && (span.rowspan || 1) <= 1)) return;
	pushHistory();
	delete selection.block.cellSpan[selection.topLeftKey];
	closeTableContextMenu(true);
	render();
}

function addTableBlockDropZone(selection = _tableSelection) {
	if (!selection || selection.sectionTag !== 'tbody') return;
	if (_tableContextTarget && _tableContextTarget.blockId === selection.blockId && _tableContextTarget.sectionTag === selection.sectionTag) {
		selection = getTableSelectionBounds(_tableContextTarget, _tableContextTarget) || selection;
	}
	const { block, rows, minRow, maxRow, minCol, maxCol } = selection;
	if (!block.tableCellBlockZones) block.tableCellBlockZones = {};
	if (!block.tableCellInnerBlocks) block.tableCellInnerBlocks = {};
	const pendingSlots = [];
	let hasEmptyWarning = false;
	for (let r = minRow; r <= maxRow; r++) {
		const row = rows[r];
		if (!row) continue;
		for (let c = minCol; c <= maxCol; c++) {
			const cellTag = row.cellTags?.[c] || 'td';
			if (cellTag !== 'td') continue;
			const cellKey = `${row.key}_c${c}`;
			if (!block.tableCellBlockZones[cellKey]) continue;
			const slotKeys = getTableCellSlotKeys(block, cellKey);
			const hasEmptySlot = slotKeys.some(slotKey => !block.tableCellInnerBlocks?.[slotKey]);
			const hasFilledSlot = slotKeys.some(slotKey => !!block.tableCellInnerBlocks?.[slotKey]);
			if (hasEmptySlot || !hasFilledSlot) { hasEmptyWarning = true; continue; }
			pendingSlots.push(getNextTableCellSlotKey(block, cellKey));
		}
	}
	if (!pendingSlots.length) {
		if (hasEmptyWarning) showPlacementToast('비어 있는 영역에 먼저 디자인 블록을 추가해 주세요.', 'error');
		closeTableContextMenu(false);
		return;
	}
	pushHistory();
	pendingSlots.forEach(slotKey => { block.tableCellBlockZones[slotKey] = true; });
	closeTableContextMenu(false);
	render();
	renderPropsTableSection(block);
}

function alignTableSelection(align) {
	const selection = _tableSelection;
	if (!selection) return;
	const { rows, minRow, maxRow, minCol, maxCol } = selection;
	pushHistory();
	for (let r = minRow; r <= maxRow; r++) {
		const row = rows[r];
		if (!row) continue;
		if (!row.cellAligns) row.cellAligns = {};
		for (let c = minCol; c <= maxCol; c++) {
			row.cellAligns[c] = align;
		}
	}
	closeTableContextMenu(false);
	render();
}

function valignTableSelection(valign) {
	const selection = _tableSelection;
	if (!selection) return;
	const { rows, minRow, maxRow, minCol, maxCol } = selection;
	pushHistory();
	for (let r = minRow; r <= maxRow; r++) {
		const row = rows[r];
		if (!row) continue;
		if (!row.cellVAligns) row.cellVAligns = {};
		for (let c = minCol; c <= maxCol; c++) {
			row.cellVAligns[c] = valign;
		}
	}
	closeTableContextMenu(false);
	render();
}

function getTableContextMenu() {
	let menu = document.getElementById('tableContextMenu');
	if (menu) return menu;

	menu = document.createElement('div');
	menu.id = 'tableContextMenu';
	menu.className = 'table-context-menu';
	menu.innerHTML = `
		<div class="table-context-menu-group">
			<p class="table-context-menu-title">정렬</p>
			<div class="table-context-aligns">
				<button type="button" data-table-menu-align="al" title="왼쪽"><i class="ri-align-left" aria-hidden="true"></i></button>
				<button type="button" data-table-menu-align="ac" title="가운데"><i class="ri-align-center" aria-hidden="true"></i></button>
				<button type="button" data-table-menu-align="ar" title="오른쪽"><i class="ri-align-right" aria-hidden="true"></i></button>
			</div>
			<div class="table-context-aligns">
				<button type="button" data-table-menu-valign="top" title="위"><i class="ri-align-top" aria-hidden="true"></i></button>
				<button type="button" data-table-menu-valign="middle" title="세로 가운데"><i class="ri-align-vertically" aria-hidden="true"></i></button>
				<button type="button" data-table-menu-valign="bottom" title="아래"><i class="ri-align-bottom" aria-hidden="true"></i></button>
			</div>
		</div>
		<button type="button" class="table-context-menu-item" data-table-menu-action="merge">셀 합치기</button>
		<button type="button" class="table-context-menu-item" data-table-menu-action="split">셀 나누기</button>
		<button type="button" class="table-context-menu-item" data-table-menu-action="block-zone">디자인블록으로 변경</button>
		<button type="button" class="table-context-menu-item" data-table-menu-action="add-block-zone">디자인 블록 추가</button>
	`;
	document.body.appendChild(menu);

	menu.addEventListener('click', event => {
		const alignBtn = event.target.closest('[data-table-menu-align]');
		if (alignBtn) {
			alignTableSelection(alignBtn.dataset.tableMenuAlign);
			return;
		}
		const valignBtn = event.target.closest('[data-table-menu-valign]');
		if (valignBtn) {
			valignTableSelection(valignBtn.dataset.tableMenuValign);
			return;
		}
		const actionBtn = event.target.closest('[data-table-menu-action]');
		if (!actionBtn || actionBtn.disabled) return;
		if (actionBtn.dataset.tableMenuAction === 'merge') applyTableMerge();
		if (actionBtn.dataset.tableMenuAction === 'split') splitTableCell();
		if (actionBtn.dataset.tableMenuAction === 'add-block-zone') addTableBlockDropZone();
		if (actionBtn.dataset.tableMenuAction === 'block-zone') {
			const sel = _tableSelection;
			if (!sel || sel.sectionTag !== 'tbody') return;
			const { rows, minRow, maxRow, minCol, maxCol, blockId } = sel;
			pushHistory();
			const block = sel.block;
			if (!block.tableCellBlockZones) block.tableCellBlockZones = {};
			for (let r = minRow; r <= maxRow; r++) {
				const row = rows[r];
				if (!row) continue;
				for (let c = minCol; c <= maxCol; c++) {
					const cellTag = row.cellTags?.[c] || 'td';
					if (cellTag !== 'td') continue;
					const cellKey = `${row.key}_c${c}`;
					if (block.tableCellBlockZones[cellKey]) {
						clearTableCellBlockZone(block, cellKey);
					} else {
						block.tableCellBlockZones[cellKey] = true;
		// Clear existing text data when the cell becomes a block zone.
		(block.items || []).forEach(item => { if (cellKey in item) item[cellKey] = ''; });
					}
				}
			}
			closeTableContextMenu(false);
			render();
			renderPropsTableSection(block);
		}
	});
	return menu;
}

function selectTableRange(start, end) {
	const bounds = getTableSelectionBounds(start, end);
	if (!bounds) return null;
	_tableSelection = bounds;
	clearTableDragRange();
	const table = document.querySelector(`[data-block-id="${CSS.escape(bounds.blockId)}"][data-table-section="${bounds.sectionTag}"]`)?.closest('table');
	if (!table) return bounds;
	table.querySelectorAll(`[data-block-id="${CSS.escape(bounds.blockId)}"][data-table-section="${bounds.sectionTag}"]`).forEach(cell => {
		const info = getTableCellDragInfo(cell);
		if (!info) return;
		if (info.rowIdx >= bounds.minRow && info.rowIdx <= bounds.maxRow && info.colIdx >= bounds.minCol && info.colIdx <= bounds.maxCol) {
			cell.classList.add('is-table-drag-range');
		}
	});
	return bounds;
}

function openTableContextMenu(cell, event) {
	if (document.body.classList.contains('preview-mode')) return;
	const info = getTableCellDragInfo(cell);
	if (!info) return;
	event.preventDefault();
	event.stopPropagation();
	closeTableCellSpanPopover();
	_tableContextTarget = info;

	if (!_tableSelection || _tableSelection.blockId !== info.blockId || _tableSelection.sectionTag !== info.sectionTag ||
		info.rowIdx < _tableSelection.minRow || info.rowIdx > _tableSelection.maxRow ||
		info.colIdx < _tableSelection.minCol || info.colIdx > _tableSelection.maxCol) {
		selectTableRange(info, info);
	}

	const menu = getTableContextMenu();
	const canMerge = _tableSelection && _tableSelection.cellCount >= 2;
	const splitSpan = _tableSelection?.block.cellSpan?.[_tableSelection.topLeftKey];
	const canSplit = !!splitSpan && ((splitSpan.colspan || 1) > 1 || (splitSpan.rowspan || 1) > 1);
	menu.querySelector('[data-table-menu-action="merge"]').disabled = !canMerge;
	menu.querySelector('[data-table-menu-action="split"]').disabled = !canSplit;
	const blockZoneBtn = menu.querySelector('[data-table-menu-action="block-zone"]');
	const addBlockZoneBtn = menu.querySelector('[data-table-menu-action="add-block-zone"]');
	const isInTbody = _tableSelection?.sectionTag === 'tbody';
	const targetIsBlockZone = !!info.block.tableCellBlockZones?.[info.cellKey];
	blockZoneBtn.style.display = isInTbody ? '' : 'none';
	addBlockZoneBtn.style.display = 'none';
	if (isInTbody) {
		const sel = _tableSelection;
		let hasTd = false, hasSomeZone = false;
		for (let r = sel.minRow; r <= sel.maxRow; r++) {
			const row = sel.rows[r]; if (!row) continue;
			for (let c = sel.minCol; c <= sel.maxCol; c++) {
				const cellKey = `${row.key}_c${c}`;
				if ((row.cellTags?.[c] || 'td') === 'td') hasTd = true;
				if (sel.block.tableCellBlockZones?.[cellKey]) hasSomeZone = true;
			}
		}
		blockZoneBtn.disabled = !hasTd;
		addBlockZoneBtn.style.display = targetIsBlockZone ? '' : 'none';
		addBlockZoneBtn.disabled = !targetIsBlockZone;
		blockZoneBtn.textContent = hasSomeZone ? '디자인블록 해제' : '디자인블록으로 변경';
	}

	menu.style.display = 'block';
	const mw = menu.offsetWidth;
	const mh = menu.offsetHeight;
	let left = event.clientX + 8;
	let top = event.clientY;
	if (left + mw > window.innerWidth - 8) left = event.clientX - mw - 8;
	if (top + mh > window.innerHeight - 8) top = window.innerHeight - mh - 8;
	menu.style.left = `${Math.max(8, left)}px`;
	menu.style.top = `${Math.max(8, top)}px`;
}

function finishTableCellDrag() {
	const drag = state.tableCellDrag;
	if (!drag) return;
	state.tableCellDrag = null;
	document.body.classList.remove('is-table-cell-dragging');

	const { start, end, moved } = drag;
	if (!moved || !end) {
		_tableSelection = null;
		clearTableDragRange();
		return;
	}

	const minRow = Math.min(start.rowIdx, end.rowIdx);
	const maxRow = Math.max(start.rowIdx, end.rowIdx);
	const minCol = Math.min(start.colIdx, end.colIdx);
	const maxCol = Math.max(start.colIdx, end.colIdx);
	const colspan = maxCol - minCol + 1;
	const rowspan = maxRow - minRow + 1;
	if (colspan === 1 && rowspan === 1) {
		clearTableDragRange();
		return;
	}

	selectTableRange(start, end);
}


function ensureTabActionDefaults(block) {
	if (!block || templateCategories[block.type] !== 'tab') return;
	block.tabMode = block.tabMode || 'panel';
	block.tabItems = block.tabItems || [];
	block.tabItems.forEach(item => {
		item.href = item.href || '';
		item.target = item.target || '_self';
		if (item.content == null) item.content = '';
	});
}

function _syncAccordionItemTitles(block) {
	(block.accordionItems || []).forEach((item, idx) => {
		if (/^항목\s*\d+$/.test((item.text || '').trim())) {
			item.text = `항목 ${idx + 1}`;
		}
	});
}

function addAccordionItem(blockId) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'accordion') return;
	pushHistory();
	block.accordionItems = block.accordionItems || [];
	block.accordionItems.push({ text: `항목 ${block.accordionItems.length + 1}`, content: '', disabled: false });
	_syncAccordionItemTitles(block);
	render();
	openBlockProps(blockId);
}

function removeAccordionItem(blockId, itemIdx) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'accordion') return;
	if (block.accordionItems.length <= 1) return;
	pushHistory();
	block.accordionItems.splice(itemIdx, 1);
	_syncAccordionItemTitles(block);
	render();
	openBlockProps(blockId);
}

function addTabItem(blockId) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'tab') return;
	ensureTabActionDefaults(block);
	pushHistory();
	block.tabItems.push({
		text: `탭 ${block.tabItems.length + 1}`,
		type: 'normal',
		href: '',
		target: '_self',
		content: ''
	});
	block.tabCols = String(Math.min(block.tabItems.length, 5));
	render();
	openBlockProps(blockId);
}

function removeTabItem(blockId, tabIdx) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'tab') return;
	if (block.tabItems.length <= 2) return;
	pushHistory();
	block.tabItems.splice(tabIdx, 1);
	block.tabCols = String(Math.min(block.tabItems.length, 5));
	render();
	openBlockProps(blockId);
}

function renderPropsTabLinks(block) {
	const container = document.getElementById('propsTabLinksContainer');
	if (!container) return;
	ensureTabActionDefaults(block);
	const isLinkMode = block.tabMode === 'link';
	const card = document.getElementById('propsTabLinkCard');
	if (card) card.style.display = isLinkMode ? '' : 'none';
	container.style.display = isLinkMode ? '' : 'none';
	if (!isLinkMode) {
		container.innerHTML = '';
		return;
	}
	container.innerHTML = (block.tabItems || []).map((item, idx) => `
		<div class="props-tab-link-row">
			<span class="props-tab-link-label">${escapeHtml(item.text || `탭 ${idx + 1}`)}</span>
			<div class="props-tab-link-controls">
				<input type="url" class="props-input props-tab-href-input" data-block-id="${escapeAttr(block.id)}" data-tab-link-idx="${idx}" placeholder="https:// 또는 /page" value="${escapeAttr(item.href || '')}">
				<select class="props-select props-tab-target-select" data-block-id="${escapeAttr(block.id)}" data-tab-target-idx="${idx}">
					<option value="_self"${(item.target || '_self') === '_self' ? ' selected' : ''}>현재 창</option>
					<option value="_blank"${item.target === '_blank' ? ' selected' : ''}>새 창</option>
				</select>
			</div>
		</div>`).join('');
}

function syncPropsHistoryType(block) {
	const isTypeB = !!block.historyImgVariant;
	document.querySelectorAll('#propHistoryType .list-use-radio').forEach(label => {
		const isActive = (label.dataset.historyType === 'b') === isTypeB;
		label.classList.toggle('is-active', isActive);
		const radio = label.querySelector('input[type="radio"]');
		if (radio) radio.checked = isActive;
	});
}

function syncPropsTabMode(block) {
	ensureTabActionDefaults(block);
	const isLinkMode = block.tabMode === 'link';
	document.querySelectorAll('#propTabMode .list-use-radio').forEach(label => {
		const isActive = label.dataset.tabMode === block.tabMode;
		label.classList.toggle('is-active', isActive);
		const radio = label.querySelector('input[type="radio"]');
		if (radio) radio.checked = isActive;
	});
	renderPropsTabLinks(block);
}

function renderPropsButtonInnerItems(block) {
	const container = document.getElementById('propsButtonInnerContainer');
	if (!container) return;
	const items = block.innerBlocks || [];
	if (items.length === 0) {
		container.innerHTML = '<p style="color:#888;font-size:0.8rem;padding:0.3rem 0">추가된 버튼이 없습니다.</p>';
		return;
	}
	const BTN_TYPE_NAMES = { 'button-01': '주요버튼', 'button-02': '보조버튼', 'button-03': '기본버튼', 'button-04': '강조버튼', 'button-05': '아이콘버튼', 'button-06': '아이콘전용' };
	container.innerHTML = items.map((ib, idx) => {
		const typeName = BTN_TYPE_NAMES[ib.type] || ib.type;
		const isIconBtn = ib.type === 'button-05' || ib.type === 'button-06';
		const isNewWindow = (ib.btnOpenType || 'default') === 'new-window';
		const bid = escapeAttr(block.id);
		const sizeOpts = [['', '기본'], ['size-sm', 'Small'], ['size-lg', 'Large'], ['size-exlg', 'Extra Large']]
			.map(([v, l]) => `<option value="${v}"${(ib.btnSize || '') === v ? ' selected' : ''}>${l}</option>`).join('');
		const openOpts = [['default', '기본'], ['new-window', '새 창']]
			.map(([v, l]) => `<option value="${v}"${(ib.btnOpenType || 'default') === v ? ' selected' : ''}>${l}</option>`).join('');
		const iconOpts = [['ri-external-link-line', '새 창 아이콘'], ['ri-phone-fill', '전화 아이콘']]
			.map(([v, l]) => `<option value="${v}"${(ib.btnIcon || 'ri-external-link-line') === v ? ' selected' : ''}>${l}</option>`).join('');
		const posOpts = [['before', '텍스트 앞'], ['after', '텍스트 뒤']]
			.map(([v, l]) => `<option value="${v}"${(ib.btnIconPos || 'before') === v ? ' selected' : ''}>${l}</option>`).join('');
		return `<div class="props-card" style="margin-bottom:0.5rem">
			<div class="props-row" style="background:var(--color-tertiary,#f5f5f5);border-radius:0.2rem;padding:0.2rem 0.5rem">
				<span class="props-label" style="font-weight:700">${idx + 1}. ${typeName}</span>
			</div>
			<div class="props-row">
				<span class="props-label">크기</span>
				<select class="props-select props-btn-inner-size" data-block-id="${bid}" data-ib-idx="${idx}">${sizeOpts}</select>
			</div>
			<div class="props-row${!isIconBtn ? ' props-row--last' : ''}">
				<span class="props-label">열기 방식</span>
				<select class="props-select props-btn-inner-opentype" data-block-id="${bid}" data-ib-idx="${idx}">${openOpts}</select>
			</div>
			${isIconBtn ? `<div class="props-row">
				<span class="props-label">아이콘</span>
				<select class="props-select props-btn-inner-icon" data-block-id="${bid}" data-ib-idx="${idx}"${isNewWindow ? ' disabled' : ''}>${iconOpts}</select>
			</div>` : ''}
			${ib.type === 'button-05' ? `<div class="props-row props-row--last">
				<span class="props-label">아이콘 위치</span>
				<select class="props-select props-btn-inner-iconpos" data-block-id="${bid}" data-ib-idx="${idx}">${posOpts}</select>
			</div>` : ''}
			${ib.type === 'button-06' ? `<div class="props-row props-row--last" style="flex-direction:column;align-items:stretch;gap:0.3rem">
				<span class="props-label">버튼 목적 (숨김 텍스트)</span>
				<div style="display:flex;gap:0.3rem;flex-direction:column;">
					<input type="text" style="width:100%; text-align: start;" class="props-input props-btn-inner-hid" data-block-id="${bid}" data-ib-idx="${idx}"
						style="flex:1;text-align:left;height:1.5rem" value="${escapeAttr((ib.items[0] || {}).hid || '')}" placeholder="버튼의 목적">
					<button type="button" class="props-add-row-btn props-btn-inner-apply-hid" data-block-id="${bid}" data-ib-idx="${idx}" style="padding:0 0.5rem;margin:0;flex-shrink:0">적용</button>
				</div>
			</div>` : ''}
		</div>`;
	}).join('');
}
function renderPropsAccordionItems(block) {
	const container = document.getElementById('propsAccordionItemsContainer');
	if (!container) return;
	const items = block.accordionItems || [];
	container.innerHTML = items.map((item, idx) => {
		const canRemove = items.length > 1;
		const textVal = escapeAttr(item.text || '');
		const contentVal = escapeHtml(item.content || '');
		return `<div class="props-list-row" style="flex-wrap:wrap;align-items:flex-start;padding:0.4rem 0.5rem;gap:0.25rem">
			<span class="props-list-row-dot" style="margin-top:0.35rem;flex-shrink:0"></span>
			<input type="text" class="props-input props-accordion-text-input" style="flex:1;min-width:0;height:1.5rem"
				data-block-id="${block.id}" data-item-idx="${idx}"
				placeholder="제목 입력" value="${textVal}">
			<label style="display:inline-flex;align-items:center;gap:0.2rem;font-size:0.575rem;flex-shrink:0;cursor:pointer">
				<input type="checkbox" class="props-accordion-dis-check"
					data-block-id="${block.id}" data-item-idx="${idx}"${item.disabled ? ' checked' : ''}>
				비활성
			</label>
			${canRemove ? `<button type="button" class="props-list-row-remove-btn props-accordion-remove-btn" data-block-id="${block.id}" data-item-idx="${idx}" title="삭제"><i class="ri-subtract-line"></i></button>` : '<span style="width:1.25rem;flex-shrink:0"></span>'}
			<textarea class="props-input props-accordion-content-input" style="flex:1 0 100%;min-width:0;width:100%;height:3rem;resize:vertical;margin-top:0.2rem;line-height:1.4"
				data-block-id="${block.id}" data-item-idx="${idx}"
				placeholder="내용 입력 (비우면 '내용이 없습니다.' 표시)">${contentVal}</textarea>
		</div>`;
	}).join('');
}
let _propsBlockId = null;

function extractBlockInlineLinks(block) {
	if (block.type === 'text-03' || block.type === 'text-04') return [];
	const links = [];
	block.items.forEach((item, colIdx) => {
		Object.entries(item).forEach(([fieldName, value]) => {
			if (typeof value !== 'string' || !value.includes('<a')) return;
			const div = document.createElement('div');
			div.innerHTML = value;
			div.querySelectorAll('a[href]').forEach((a, linkIdx) => {
				let text = '';
				for (const node of a.childNodes) {
					if (node.nodeType === Node.TEXT_NODE) { text = node.textContent.trim(); if (text) break; }
				}
				if (!text) text = a.textContent.trim();
				links.push({ colIdx, fieldName, linkIdx, text, href: a.getAttribute('href') || '' });
			});
		});
	});
	return links;
}

function renderPropsInlineLinks(links) {
	const container = document.getElementById('propsInlineLinkList');
	if (!container) return;
	container.innerHTML = links.map((link, idx) => `
		<div class="props-card" style="${idx > 0 ? 'margin-top:6px' : ''}">
			<div class="props-row" style="padding-top:6px;padding-bottom:2px">
				<span class="props-label" style="font-size:0.55rem;color:#888">링크 ${idx + 1}</span>
			</div>
			<div class="props-row">
				<span class="props-label">링크 텍스트</span>
				<input type="text" class="props-input props-input--wide"
					data-col-idx="${link.colIdx}"
					data-field-name="${escapeAttr(link.fieldName)}"
					data-link-idx="${link.linkIdx}"
					data-inline-link-field="text"
					value="${escapeAttr(link.text)}"
					placeholder="링크 텍스트">
			</div>
			<div class="props-row props-row--last">
				<span class="props-label">URL</span>
				<input type="url" class="props-input props-input--wide"
					data-col-idx="${link.colIdx}"
					data-field-name="${escapeAttr(link.fieldName)}"
					data-link-idx="${link.linkIdx}"
					data-inline-link-field="href"
					value="${escapeAttr(link.href)}"
					placeholder="https://...">
			</div>
		</div>
	`).join('');
}

function openBlockProps(blockId) {
	let block = state.blocks.find(b => b.id === blockId);
	let isMixInnerBlock = false;
	if (!block) {
		const mixRef = resolveMixInnerRef(blockId);
		if (mixRef) {
			block = { id: blockId, type: mixRef.innerBlock.type, items: mixRef.innerBlock.items,
					blockWidth: null, blockAlign: '',
					marginTop: mixRef.innerBlock.marginTop ?? 0,
					marginBottom: mixRef.innerBlock.marginBottom ?? 0,
					marginLeft: mixRef.innerBlock.marginLeft ?? 0,
					marginRight: mixRef.innerBlock.marginRight ?? 0,
					blockIndent: !!mixRef.innerBlock.blockIndent,
					listMarkerType: mixRef.innerBlock.listMarkerType || '' };
			isMixInnerBlock = true;
		} else {
			const tcellRef = resolveTableCellInnerRef(blockId);
			if (!tcellRef) return;
			block = { id: blockId, type: tcellRef.innerBlockData.type, items: tcellRef.innerBlockData.items, blockWidth: null, marginBottom: tcellRef.innerBlockData.marginBottom ?? 0, blockAlign: '', blockIndent: !!tcellRef.innerBlockData.blockIndent };
			isMixInnerBlock = true;
		}
	}
	_propsBlockId = blockId;

	const panel = document.getElementById('blockPropsPanel');
	const titleEl = document.getElementById('blockPropsTitle');
	const widthSel = document.getElementById('propBlockWidth');
	const marginInput = document.getElementById('propMarginBottom');
	const marginTopInput = document.getElementById('propMarginTop');
	const marginLeftInput = document.getElementById('propMarginLeft');
	const marginRightInput = document.getElementById('propMarginRight');
	const indentInput = document.getElementById('propBlockIndent');

	if (titleEl) titleEl.textContent = block.type || '블록';
	if (widthSel) {
		const isNlSection = !isMixInnerBlock &&
			templateCategories[block.type] === 'design-template-section' &&
			componentTemplates[block.type]?.templateFilters?.includes('newsletter');
		if (isNlSection) {
			widthSel.innerHTML =
				'<option value="750px">750px</option>' +
				'<option value="1200px">1200px</option>';
		} else {
			widthSel.innerHTML =
				'<option value="">전체 너비</option>' +
				'<option value="auto">자동</option>' +
				'<option value="25%">25%</option>' +
				'<option value="33.333%">33%</option>' +
				'<option value="50%">50%</option>' +
				'<option value="66.666%">66%</option>' +
				'<option value="75%">75%</option>';
		}
		widthSel.value = block.blockWidth || (isNlSection ? '750px' : '');
	}
	if (marginTopInput) marginTopInput.value = block.marginTop ?? 0;
	if (marginInput) marginInput.value = block.marginBottom ?? 10;
	if (marginLeftInput) marginLeftInput.value = block.marginLeft ?? 0;
	if (marginRightInput) marginRightInput.value = block.marginRight ?? 0;
	if (indentInput) indentInput.checked = !!block.blockIndent;
	document.querySelectorAll('#propBlockAlign .props-align-btn').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.align === (block.blockAlign || ''));
	});

	const listMarkerSection = document.getElementById('propsListMarkerSection');
	if (listMarkerSection) {
		const hasMarker = block.type === 'list-02';
		listMarkerSection.style.display = hasMarker ? '' : 'none';
		if (hasMarker) {
			const currentType = block.listMarkerType || 'alpha';
			document.querySelectorAll('#propListMarkerType .props-marker-btn').forEach(btn => {
				btn.classList.toggle('is-active', btn.dataset.marker === currentType);
			});
		}
	}

	const linkSection = document.getElementById('propsLinkSection');
	if (linkSection) {
		const isLinkBlock = block.type === 'text-03';
		linkSection.style.display = isLinkBlock ? '' : 'none';
		if (isLinkBlock) {
			document.getElementById('propLinkHref').value = block.linkHref || '';
			document.getElementById('propLinkTarget').value = block.linkTarget || '_blank';
		}
	}

	const inlineLinkSection = document.getElementById('propsInlineLinkSection');
	if (inlineLinkSection) {
		const inlineLinks = extractBlockInlineLinks(block);
		const hasInlineLinks = inlineLinks.length > 0;
		inlineLinkSection.style.display = hasInlineLinks ? '' : 'none';
		if (hasInlineLinks) renderPropsInlineLinks(inlineLinks);
	}

	const downloadSection = document.getElementById('propsDownloadSection');
	if (downloadSection) {
		const isDownloadBlock = block.type === 'text-04';
		downloadSection.style.display = isDownloadBlock ? '' : 'none';
		if (isDownloadBlock) {
			const notice = document.getElementById('propsDownloadNotice');
			if (notice) notice.style.display = 'none';
			const fileInput = document.getElementById('propDownloadFile');
			if (fileInput) fileInput.value = '';
		}
	}

	const boxImgSection = document.getElementById('propsBoxImgSection');
	if (boxImgSection) {
		const isBoxImg = !isMixInnerBlock && block.type === 'box-04';
		boxImgSection.style.display = isBoxImg ? '' : 'none';
		if (isBoxImg) {
			const altInput = document.getElementById('propBoxImgAlt');
			if (altInput) altInput.value = block.imgAlt || '';
			const fileInput = document.getElementById('propBoxImgFile');
			if (fileInput) fileInput.value = '';
		}
	}

	const symbolBoxSection = document.getElementById('propsSymbolBoxSection');
	if (symbolBoxSection) {
		const isSymbol = !isMixInnerBlock && templateCategories[block.type] === 'symbol';
		symbolBoxSection.style.display = isSymbol ? '' : 'none';
		if (isSymbol) syncSymbolBoxCheckboxes(blockId);
	}

	const boxIcoSection = document.getElementById('propsBoxIcoSection');
	if (boxIcoSection) {
		const isBox05 = !isMixInnerBlock && block.type === 'box-05';
		boxIcoSection.style.display = isBox05 ? '' : 'none';
		if (isBox05) {
			const icoSelect = document.getElementById('propBoxIco');
			if (icoSelect) icoSelect.value = block.icoId || 'ico-box1';
		}
	}

	const historyTypeSection = document.getElementById('propsHistoryTypeSection');
	if (historyTypeSection) {
		const isHistoryTyA = !isMixInnerBlock && block.type === 'history-tyA';
		historyTypeSection.style.display = isHistoryTyA ? '' : 'none';
		if (isHistoryTyA) syncPropsHistoryType(block);
	}

	const tabSection = document.getElementById('propsTabSection');
	if (tabSection) {
		const isTab = !isMixInnerBlock && templateCategories[block.type] === 'tab';
		tabSection.style.display = isTab ? '' : 'none';
		if (isTab) {
			ensureTabActionDefaults(block);
			syncPropsTabMode(block);
			const colsSelect = document.getElementById('propTabCols');
			if (colsSelect) colsSelect.value = block.tabCols || '4';
		}
	}

	const processSection = document.getElementById('propsProcessSection');
	if (processSection) {
		const isProcess = !isMixInnerBlock && templateCategories[block.type] === 'process';
		processSection.style.display = isProcess ? '' : 'none';
		if (isProcess) {
			const isHoriz = block.type === 'process-01';
			const horizCard = document.getElementById('propsProcessHorizCard');
			const addStepBtn = document.getElementById('propsAddProcessStep');
			if (horizCard) horizCard.style.display = isHoriz ? '' : 'none';
			if (addStepBtn) addStepBtn.style.display = 'none';
			if (isHoriz) {
				const colsSelect = document.getElementById('propProcessCols');
				if (colsSelect) colsSelect.value = String(block.items.length);
			}
			renderPropsProcessSteps(block);
		}
	}

	const accordionSection = document.getElementById('propsAccordionSection');
	if (accordionSection) {
		const isAccordion = !isMixInnerBlock && templateCategories[block.type] === 'accordion' && block.type !== 'accordion-03';
		accordionSection.style.display = isAccordion ? '' : 'none';
		if (isAccordion) {
			const sizeSelect = document.getElementById('propAccordionSize');
			if (sizeSelect) sizeSelect.value = block.accordionSize || '';
			renderPropsAccordionItems(block);
		}
	}

	const discloserSection = document.getElementById('propsDiscloserSection');
	if (discloserSection) {
		const isDiscloser = !isMixInnerBlock && block.type === 'accordion-03';
		discloserSection.style.display = isDiscloser ? '' : 'none';
		if (isDiscloser) {
			const titleInput = document.getElementById('propDiscloserTitle');
			const contentInput = document.getElementById('propDiscloserContent');
			if (titleInput) titleInput.value = block.discloserTitle || '';
			if (contentInput) contentInput.value = block.discloserContent || '';
		}
	}

	const buttonInnerSection = document.getElementById('propsButtonInnerSection');
	if (buttonInnerSection) {
		const isButtonContainer = !isMixInnerBlock && block.type === 'button-00';
		buttonInnerSection.style.display = isButtonContainer ? '' : 'none';
		if (isButtonContainer) renderPropsButtonInnerItems(block);
	}

	const tableSection = document.getElementById('propsTableSection');
	if (tableSection) {
		const isTable = !isMixInnerBlock && templateCategories[block.type] === 'table';
		tableSection.style.display = isTable ? '' : 'none';
		if (isTable) renderPropsTableSection(block);
	}

	const buttonSection = document.getElementById('propsButtonSection');
	if (buttonSection) {
		const isButton = !isMixInnerBlock && templateCategories[block.type] === 'button' && block.type !== 'button-00';
		buttonSection.style.display = isButton ? '' : 'none';
		if (isButton) {
			const sizeSelect = document.getElementById('propBtnSize');
			if (sizeSelect) sizeSelect.value = block.btnSize || '';
			const openTypeSelect = document.getElementById('propBtnOpenType');
			if (openTypeSelect) openTypeSelect.value = block.btnOpenType || 'default';

			const isIconBtn = block.type === 'button-05' || block.type === 'button-06';
			const iconCard = document.getElementById('propsButtonIconCard');
			if (iconCard) iconCard.style.display = isIconBtn ? '' : 'none';

			if (isIconBtn) {
				const iconSelect = document.getElementById('propBtnIcon');
				if (iconSelect) iconSelect.value = block.btnIcon || 'ri-external-link-line';
				const iconPosRow = document.getElementById('propBtnIconPosRow');
				if (iconPosRow) iconPosRow.style.display = block.type === 'button-05' ? '' : 'none';
				const iconPosSelect = document.getElementById('propBtnIconPos');
				if (iconPosSelect && block.type === 'button-05') iconPosSelect.value = block.btnIconPos || 'before';
			}

			const hidCard = document.getElementById('propsButtonHidCard');
			if (hidCard) hidCard.style.display = block.type === 'button-06' ? '' : 'none';
			if (block.type === 'button-06') {
				const hidInput = document.getElementById('propBtnHidText');
				if (hidInput) hidInput.value = (block.items[0] || {}).hid || '';
			}

			const priNotice = document.getElementById('propsButtonPriNotice');
			if (priNotice) priNotice.style.display = block.type === 'button-01' ? '' : 'none';
		}
	}

	const nlHeaderSection = document.getElementById('propsNewsletterHeaderSection');
	if (nlHeaderSection) {
		const isNlHeader = /^newsletter-\d+__section_1$/.test(block.type);
		nlHeaderSection.style.display = isNlHeader ? '' : 'none';
		if (isNlHeader) {
			const item = block.items[0] || {};
			const schoolNameInput = document.getElementById('propNlSchoolName');
			const deptInput = document.getElementById('propNlDept');
			const phoneInput = document.getElementById('propNlPhone');
			const logoFileInput = document.getElementById('propNlLogoFile');
			if (schoolNameInput) schoolNameInput.value = item.schoolName || '';
			if (deptInput) deptInput.value = item.dept || '';
			if (phoneInput) phoneInput.value = item.phone || '';
			if (logoFileInput) logoFileInput.value = '';
			const bodyFsInput = document.getElementById('propNlBodyFontSize');
			if (bodyFsInput) bodyFsInput.value = block.nlContentFontSize || 15;
		}
	}

	const nlFooterSection = document.getElementById('propsNewsletterFooterSection');
	if (nlFooterSection) {
		// section_4(분리 구조) 또는 section_1이 footer를 포함하는 통합 구조일 때 표시
		const isNlFooter = /^newsletter-\d+__section_4$/.test(block.type) ||
			(/^newsletter-\d+__section_1$/.test(block.type) && !!componentTemplates[block.type]?.element?.querySelector('.nl-footer-section'));
		nlFooterSection.style.display = isNlFooter ? '' : 'none';
		if (isNlFooter) {
			const item = block.items[0] || {};
			const yearInput = document.getElementById('propNlYear');
			const monthInput = document.getElementById('propNlMonth');
			const dayInput = document.getElementById('propNlDay');
			const schoolInput = document.getElementById('propNlFooterSchool');
			const stampSel = document.getElementById('propNlStamp');
			if (yearInput) yearInput.value = item.nlYear || '';
			if (monthInput) monthInput.value = item.nlMonth || '';
			if (dayInput) dayInput.value = item.nlDay || '';
			if (schoolInput) schoolInput.value = item.nlFooterSchool || '';
			if (stampSel) stampSel.value = item.nlStamp || 'omit';
		}
	}

	const privacyVarsSection = document.getElementById('propsPrivacyVarsSection');
	if (privacyVarsSection) {
		const isPrivacy = block.type.startsWith('privacy-') && block.type.includes('__section_');
		privacyVarsSection.style.display = isPrivacy ? '' : 'none';
		if (isPrivacy) {
			const nameInput = document.getElementById('propPpSchoolName');
			const urlInput = document.getElementById('propPpSchoolUrl');
			const dateInput = document.getElementById('propPpStartDate');
			if (nameInput) nameInput.value = state.templateVars.schoolName || '';
			if (urlInput) urlInput.value = state.templateVars.schoolUrl || '';
			if (dateInput) dateInput.value = _ppFormatDateToInput(state.templateVars.startYear || '');
		}
	}

	const privacyIconSection = document.getElementById('propsPrivacyIconSection');
	if (privacyIconSection) {
		const hasPrivacy02 = state.blocks.some(b => b.type === 'privacy-02' || b.type.startsWith('privacy-02__'));
		const isPrivacyTitle = !isMixInnerBlock && block.type === 'title-02' && hasPrivacy02;
		privacyIconSection.style.display = isPrivacyTitle ? '' : 'none';
		const anchorIdCard = document.getElementById('propsAnchorIdCard');
		const anchorIdInput = document.getElementById('propAnchorId');
		if (anchorIdCard) anchorIdCard.style.display = isPrivacyTitle ? '' : 'none';
		if (anchorIdInput && isPrivacyTitle) anchorIdInput.value = block.anchorId || '';
		if (isPrivacyTitle) {
			document.querySelectorAll('#propsPrivacyIconGrid img[data-src]').forEach(img => {
				img.src = img.dataset.src;
				img.removeAttribute('data-src');
				img.onerror = function() { var btn = this.closest('.props-privacy-icon-btn'); if (btn) btn.style.display = 'none'; };
			});
			const selectedIcons = Array.isArray(block.privacyIcons) ? block.privacyIcons : [];
			document.querySelectorAll('#propsPrivacyIconGrid .props-privacy-icon-btn').forEach(btn => {
				btn.classList.toggle('is-active', selectedIcons.includes(btn.dataset.iconSrc));
			});
		}
	}

	panel.classList.add('is-open');
	document.getElementById('builderMain')?.classList.add('has-selection', 'has-section');
}

function closeBlockProps() {
	_propsBlockId = null;
	const panel = document.getElementById('blockPropsPanel');
	panel?.classList.remove('is-open');
	document.getElementById('builderMain')?.classList.remove('has-selection', 'has-section');
}

function initNlInlineToolbar() {
	const toolbar = document.getElementById('nlInlineToolbar');
	if (!toolbar) return;

	let _savedRange = null;

	function saveRange() {
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
			_savedRange = sel.getRangeAt(0).cloneRange();
			return true;
		}
		return false;
	}

	function restoreRange() {
		if (!_savedRange) return false;
		const node = _savedRange.commonAncestorContainer;
		const editEl = node.nodeType === 3 ? node.parentElement : node;
		const ceEl = editEl?.closest('[contenteditable]');
		if (ceEl) ceEl.focus();
		const sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(_savedRange);
		return true;
	}

	toolbar.addEventListener('mousedown', e => {
		_nlToolbarActive = true;
		if (e.target.closest('input, select')) {
			saveRange();
			return;
		}
		e.preventDefault();
	});

	function showToolbar(range) {
		const rect = range.getBoundingClientRect();
		if (!rect.width && !rect.height) return;
		let left = rect.left;
		let top = rect.top - 48;
		if (top < 8) top = rect.bottom + 8;
		if (left + 230 > window.innerWidth) left = window.innerWidth - 238;
		if (left < 8) left = 8;
		toolbar.style.left = left + 'px';
		toolbar.style.top = top + 'px';
		toolbar.style.display = 'flex';
		syncInlineToolbarControls(range);
	}

	const sizeSelect = document.getElementById('nlItbSize');
	const weightSelect = document.getElementById('nlItbWeight');

	function getRangeStyleTarget(range) {
		const node = range.startContainer.nodeType === 3
			? range.startContainer.parentElement
			: range.startContainer.childNodes[range.startOffset] || range.startContainer;
		return (node.nodeType === 1 ? node : node.parentElement) || null;
	}

	function syncInlineToolbarControls(range) {
		const target = getRangeStyleTarget(range);
		if (!target) return;
		const style = window.getComputedStyle(target);
		if (sizeSelect) {
			const px = Math.round(parseFloat(style.fontSize || '0'));
			const option = Array.from(sizeSelect.options).find(opt => Number(opt.value) === px);
			sizeSelect.value = option ? option.value : '';
		}
		if (weightSelect) {
			const weight = Number(style.fontWeight) || 400;
			weightSelect.value = weight >= 800 ? '800' : weight >= 700 ? '700' : weight >= 500 ? '500' : '400';
		}
	}

	function applyInlineToolbarAndClose() {
		if (!restoreRange()) {
			hideToolbar();
			return;
		}
		const styleObj = {};
		if (sizeSelect?.value) styleObj.fontSize = `${sizeSelect.value}px`;
		if (weightSelect?.value) styleObj.fontWeight = weightSelect.value;
		if (Object.keys(styleObj).length) applySpanStyle(styleObj);
		hideToolbar();
	}

	function hideToolbar() {
		toolbar.style.display = 'none';
		_savedRange = null;
		_nlToolbarActive = false;
	}

	function isInNlContent(node) {
		const el = node?.nodeType === 3 ? node.parentElement : node;
		return !!el?.closest('[data-edit-field="body"], [contenteditable="true"]');
	}

	document.addEventListener('mouseup', e => {
		if (toolbar.contains(e.target)) return;
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.rangeCount) {
			if (!toolbar.contains(e.target)) hideToolbar();
			return;
		}
		const range = sel.getRangeAt(0);
		if (isInNlContent(range.commonAncestorContainer)) {
			saveRange();
			showToolbar(range);
		} else {
			hideToolbar();
		}
	});

	document.addEventListener('mousedown', e => {
		if (!toolbar.contains(e.target) && !e.target.closest('[data-edit-field="body"], [contenteditable="true"]')) {
			hideToolbar();
		}
	});

	function applySpanStyle(styleObj) {
		const sel = window.getSelection();
		if (!sel || !sel.rangeCount || sel.isCollapsed) return;
		const range = sel.getRangeAt(0);
		try {
			const frag = range.extractContents();
			const tmp = document.createElement('div');
			tmp.appendChild(frag);

			const mergedStyles = {};
			const kids = Array.from(tmp.childNodes).filter(n => n.nodeType !== 3 || n.textContent.trim());
			if (kids.length === 1 && kids[0].nodeName === 'SPAN' && kids[0].style?.cssText) {
				for (const prop of kids[0].style) {
					mergedStyles[prop] = kids[0].style[prop];
				}
			}
			Object.assign(mergedStyles, styleObj); // ???ㅽ??쇱씠 ?곗꽑

			tmp.querySelectorAll('span[style]').forEach(s => s.replaceWith(...s.childNodes));

			// Wrap the selected content with one merged style span.
			const span = document.createElement('span');
			Object.assign(span.style, mergedStyles);
			while (tmp.firstChild) span.appendChild(tmp.firstChild);

			range.insertNode(span);
			const nr = document.createRange();
			nr.selectNode(span);
			sel.removeAllRanges();
			sel.addRange(nr);
			saveRange();
			showToolbar(nr);
		} catch (err) {
			console.warn('nl inline style apply failed', err);
		}
	}

	document.getElementById('nlItbColor')?.addEventListener('change', e => {
		if (!restoreRange()) return;
		applySpanStyle({ color: e.target.value });
	});

	document.addEventListener('keydown', e => {
		if (toolbar.style.display !== 'flex') return;
		if (e.key !== 'Enter') return;
		if (document.activeElement && !toolbar.contains(document.activeElement)) return;
		e.preventDefault();
		applyInlineToolbarAndClose();
	});

	document.getElementById('nlItbApplySize')?.addEventListener('click', applyInlineToolbarAndClose);

	// Apply select changes immediately.
	sizeSelect?.addEventListener('change', () => {
		if (!sizeSelect.value) return;
		if (!restoreRange()) return;
		applySpanStyle({ fontSize: `${sizeSelect.value}px` });
	});

	weightSelect?.addEventListener('change', () => {
		if (!restoreRange()) return;
		applySpanStyle({ fontWeight: weightSelect.value });
	});

	document.getElementById('nlItbReset')?.addEventListener('click', () => {
		if (!restoreRange()) return;
		const sel = window.getSelection();
		if (!sel || !sel.rangeCount || sel.isCollapsed) return;
		const range = sel.getRangeAt(0);
		try {
			const frag = range.extractContents();
			const tmp = document.createElement('div');
			tmp.appendChild(frag);
			tmp.querySelectorAll('span[style], font').forEach(node => {
				node.replaceWith(...node.childNodes);
			});
			range.insertNode(tmp);
			// Unwrap the temporary node.
			const parent = tmp.parentNode;
			while (tmp.firstChild) parent.insertBefore(tmp.firstChild, tmp);
			parent.removeChild(tmp);
			saveRange();
		} catch (err) {
			console.warn('nl format reset failed', err);
		}
	});
}

function initBlockPropsPanel() {

	document.getElementById('propBlockWidth')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.blockWidth = this.value || null;
		render();
	});

	document.getElementById('propMarginTop')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.marginTop = Number(this.value) || 0;
		render();
	});

	document.getElementById('propMarginBottom')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.marginBottom = Number(this.value) || 0;
		render();
	});

	document.getElementById('propMarginLeft')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.marginLeft = Number(this.value) || 0;
		render();
	});

	document.getElementById('propMarginRight')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.marginRight = Number(this.value) || 0;
		render();
	});

	document.getElementById('propBlockIndent')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.blockIndent = this.checked;
		render();
	});

	document.querySelectorAll('#propBlockAlign .props-align-btn').forEach(btn => {
		btn.addEventListener('click', function () {
			if (!_propsBlockId) return;
			const block = resolveEditableBlockData(_propsBlockId);
			if (!block) return;
			pushHistory();
			const newAlign = block.blockAlign === this.dataset.align ? '' : this.dataset.align;
			block.blockAlign = newAlign;
			document.querySelectorAll('#propBlockAlign .props-align-btn').forEach(b => {
				b.classList.toggle('is-active', b.dataset.align === newAlign);
			});
			render();
		});
	});

	document.getElementById('propListMarkerType')?.addEventListener('click', function (e) {
		const btn = e.target.closest('.props-marker-btn');
		if (!btn || !_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.listMarkerType = btn.dataset.marker;
		this.querySelectorAll('.props-marker-btn').forEach(b => b.classList.toggle('is-active', b === btn));
		render();
	});

	document.getElementById('propLinkHref')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.linkHref = this.value.trim();
		render();
	});

	document.getElementById('propLinkTarget')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		pushHistory();
		block.linkTarget = this.value;
		render();
	});

	document.getElementById('propsInlineLinkList')?.addEventListener('change', function (e) {
		const input = e.target.closest('[data-inline-link-field]');
		if (!input || !_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block) return;
		const colIdx = Number(input.dataset.colIdx);
		const fieldName = input.dataset.fieldName;
		const linkIdx = Number(input.dataset.linkIdx);
		const linkField = input.dataset.inlineLinkField;
		const item = block.items[colIdx];
		if (!item || typeof item[fieldName] !== 'string') return;
		const div = document.createElement('div');
		div.innerHTML = item[fieldName];
		const anchor = div.querySelectorAll('a[href]')[linkIdx];
		if (!anchor) return;
		if (linkField === 'href') {
			anchor.setAttribute('href', input.value.trim());
		} else {
			let updated = false;
			for (const node of anchor.childNodes) {
				if (node.nodeType === Node.TEXT_NODE) { node.textContent = input.value; updated = true; break; }
			}
			if (!updated) anchor.textContent = input.value;
		}
		pushHistory();
		item[fieldName] = div.innerHTML;
		render();
	});

	document.getElementById('propsApplyDownload')?.addEventListener('click', () => {
		const notice = document.getElementById('propsDownloadNotice');
		if (notice) notice.style.display = '';
	});

	document.getElementById('propBoxImgFile')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'box-04') return;
		const file = this.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		const reader = new FileReader();
		reader.onload = () => {
			pushHistory();
			block.imgSrc = String(reader.result || '');
			render();
		};
		reader.readAsDataURL(file);
	});

	document.getElementById('propsApplyBoxImg')?.addEventListener('click', () => {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'box-04') return;
		const altInput = document.getElementById('propBoxImgAlt');
		if (altInput) {
			pushHistory();
			block.imgAlt = altInput.value.trim();
			render();
		}
	});

	document.querySelectorAll('#propsSymbolBoxSection [data-symbol-box-row] input[type="checkbox"]').forEach(checkbox => {
		checkbox.addEventListener('change', function () {
			if (!_propsBlockId) return;
			const key = this.closest('[data-symbol-box-row]')?.dataset.symbolBoxRow;
			if (!key) return;
			toggleSymbolBox(_propsBlockId, key, this.checked);
		});
	});

	document.getElementById('propBoxIco')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'box-05') return;
		pushHistory();
		block.icoId = this.value;
		render();
	});

	document.getElementById('propsPrivacyIconGrid')?.addEventListener('click', e => {
		const btn = e.target.closest('.props-privacy-icon-btn');
		if (!btn || !_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'title-02') return;
		pushHistory();
		const clickedSrc = btn.dataset.iconSrc;
		const icons = Array.isArray(block.privacyIcons) ? block.privacyIcons : [];
		const idx = icons.indexOf(clickedSrc);
		if (idx >= 0) icons.splice(idx, 1);
		else icons.push(clickedSrc);
		block.privacyIcons = icons;
		document.querySelectorAll('#propsPrivacyIconGrid .props-privacy-icon-btn').forEach(b => {
			b.classList.toggle('is-active', icons.includes(b.dataset.iconSrc));
		});
		render();
	});

	document.getElementById('propBtnSize')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'button') return;
		pushHistory();
		block.btnSize = this.value;
		render();
	});

	document.getElementById('propBtnOpenType')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'button') return;
		pushHistory();
		block.btnOpenType = this.value;
		const iconSelect = document.getElementById('propBtnIcon');
		if (iconSelect) iconSelect.disabled = this.value === 'new-window';
		render();
	});

	document.getElementById('propBtnIcon')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || (block.type !== 'button-05' && block.type !== 'button-06')) return;
		pushHistory();
		block.btnIcon = this.value;
		render();
	});

	document.getElementById('propBtnIconPos')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'button-05') return;
		pushHistory();
		block.btnIconPos = this.value;
		render();
	});

	document.getElementById('propsApplyBtnHid')?.addEventListener('click', () => {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'button-06') return;
		const hidInput = document.getElementById('propBtnHidText');
		if (!hidInput) return;
		pushHistory();
		if (!block.items[0]) block.items[0] = {};
		block.items[0].hid = hidInput.value.trim() || '버튼의 목적';
		render();
	});

	const btnInnerContainer = document.getElementById('propsButtonInnerContainer');
	if (btnInnerContainer) {
		btnInnerContainer.addEventListener('change', event => {
			const sel = event.target.closest('select');
			if (!sel) return;
			const blockId = sel.dataset.blockId;
			const ibIdx = Number(sel.dataset.ibIdx);
			const block = resolveEditableBlockData(blockId);
			if (!block || block.type !== 'button-00' || !block.innerBlocks?.[ibIdx]) return;
			const ib = block.innerBlocks[ibIdx];
			pushHistory();
			if (sel.classList.contains('props-btn-inner-size')) {
				ib.btnSize = sel.value;
			} else if (sel.classList.contains('props-btn-inner-opentype')) {
				ib.btnOpenType = sel.value;
				const iconSel = btnInnerContainer.querySelector(`.props-btn-inner-icon[data-ib-idx="${ibIdx}"]`);
				if (iconSel) iconSel.disabled = sel.value === 'new-window';
			} else if (sel.classList.contains('props-btn-inner-icon')) {
				ib.btnIcon = sel.value;
			} else if (sel.classList.contains('props-btn-inner-iconpos')) {
				ib.btnIconPos = sel.value;
			} else {
				return;
			}
			render();
		});
		btnInnerContainer.addEventListener('click', event => {
			const btn = event.target.closest('.props-btn-inner-apply-hid');
			if (!btn) return;
			const blockId = btn.dataset.blockId;
			const ibIdx = Number(btn.dataset.ibIdx);
			const block = resolveEditableBlockData(blockId);
			if (!block || block.type !== 'button-00' || !block.innerBlocks?.[ibIdx]) return;
			const ib = block.innerBlocks[ibIdx];
			const input = btnInnerContainer.querySelector(`.props-btn-inner-hid[data-ib-idx="${ibIdx}"]`);
			if (!input) return;
			pushHistory();
			if (!ib.items[0]) ib.items[0] = {};
			ib.items[0].hid = input.value.trim() || '버튼의 목적';
			render();
		});
	}

	canvasGrid.addEventListener('click', event => {
		if (document.body.classList.contains('preview-mode')) return;
		const addBtn = event.target.closest('.list-row-inline-btn--add[data-row-key]');
		if (addBtn) {
			event.stopPropagation();
			addSiblingRowToBlock(addBtn.dataset.blockId, addBtn.dataset.rowKey);
			return;
		}
		const childBtn = event.target.closest('.list-row-inline-btn--child[data-row-key]');
		if (childBtn && !childBtn.disabled) {
			event.stopPropagation();
			addChildRowToBlock(childBtn.dataset.blockId, childBtn.dataset.rowKey);
			return;
		}
		const removeBtn = event.target.closest('.list-row-inline-btn--remove[data-row-key]');
		if (removeBtn && !removeBtn.disabled) {
			event.stopPropagation();
			removeListRowFromBlock(removeBtn.dataset.blockId, removeBtn.dataset.rowKey);
			return;
		}
	}, true);

	// 연혁 타입A 스타일 선택
	document.getElementById('propHistoryType')?.addEventListener('click', event => {
		const btn = event.target.closest('[data-history-type]');
		if (!btn || !_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'history-tyA') return;
		pushHistory();
		block.historyImgVariant = btn.dataset.historyType === 'b';
		render();
		syncPropsHistoryType(block);
	});

	// 탭 동적 설정
	document.getElementById('propTabMode')?.addEventListener('click', event => {
		const btn = event.target.closest('[data-tab-mode]');
		if (!btn || !_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'tab') return;
		pushHistory();
		ensureTabActionDefaults(block);
		block.tabMode = btn.dataset.tabMode === 'link' ? 'link' : 'panel';
		render();
		syncPropsTabMode(block);
	});

	document.getElementById('propsTabLinksContainer')?.addEventListener('change', event => {
		const hrefInput = event.target.closest('.props-tab-href-input');
		const targetSelect = event.target.closest('.props-tab-target-select');
		const control = hrefInput || targetSelect;
		if (!control) return;
		const block = resolveEditableBlockData(control.dataset.blockId);
		if (!block || templateCategories[block.type] !== 'tab') return;
		const idx = Number(hrefInput ? control.dataset.tabLinkIdx : control.dataset.tabTargetIdx);
		if (!block.tabItems?.[idx]) return;
		pushHistory();
		ensureTabActionDefaults(block);
		if (hrefInput) block.tabItems[idx].href = control.value.trim();
		if (targetSelect) block.tabItems[idx].target = control.value === '_blank' ? '_blank' : '_self';
		render();
		renderPropsTabLinks(block);
	});


	// 탭 열 수 변경
	document.getElementById('propTabCols')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'tab') return;
		pushHistory();
		block.tabCols = this.value;
		render();
	});
	// 절차(가로형): 열 수 변경
	document.getElementById('propProcessCols')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'process-01') return;
		pushHistory();
		block.columns = Number(this.value) || 4;
		syncBlockItems(block);
		render();
		renderPropsProcessSteps(block);
	});
	document.getElementById('propsProcessStepsContainer')?.addEventListener('change', event => {
		const input = event.target.closest('.props-process-sub-input');
		if (!input) return;
		const blockId = input.dataset.blockId;
		const stepIdx = Number(input.dataset.stepIdx);
		const block = resolveEditableBlockData(blockId);
		if (!block || templateCategories[block.type] !== 'process') return;
		const item = block.items[stepIdx];
		if (!item) return;
		const newSub = input.value.trim();
		if (item.sub === newSub) return;
		pushHistory();
		item.sub = newSub;
		render();
	});

	document.getElementById('propsAddProcessStep')?.addEventListener('click', () => {
		if (!_propsBlockId) return;
		addProcessStep(_propsBlockId);
	});

	document.getElementById('propsProcessStepsContainer')?.addEventListener('click', event => {
		const btn = event.target.closest('.props-process-step-remove-btn');
		if (!btn || btn.disabled) return;
		removeProcessStep(btn.dataset.blockId, Number(btn.dataset.stepIdx));
	});

	// 아코디언 크기 변경
	document.getElementById('propAccordionSize')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'accordion') return;
		pushHistory();
		block.accordionSize = this.value;
		render();
	});

	document.getElementById('propsAddAccordionItem')?.addEventListener('click', () => {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'accordion') return;
		pushHistory();
		block.accordionItems = block.accordionItems || [];
		block.accordionItems.push({ text: `硫붾돱 ${block.accordionItems.length + 1}`, content: '', disabled: false });
		render();
		renderPropsAccordionItems(block);
	});

	const accordionItemsContainer = document.getElementById('propsAccordionItemsContainer');
	if (accordionItemsContainer) {
		accordionItemsContainer.addEventListener('change', event => {
			const textInput = event.target.closest('.props-accordion-text-input');
			if (textInput) {
				const block = resolveEditableBlockData(textInput.dataset.blockId);
				const idx = Number(textInput.dataset.itemIdx);
				if (!block || !block.accordionItems || !block.accordionItems[idx]) return;
				pushHistory();
				block.accordionItems[idx].text = textInput.value;
				render();
				return;
			}
			const contentInput = event.target.closest('.props-accordion-content-input');
			if (contentInput) {
				const block = resolveEditableBlockData(contentInput.dataset.blockId);
				const idx = Number(contentInput.dataset.itemIdx);
				if (!block || !block.accordionItems || !block.accordionItems[idx]) return;
				pushHistory();
				block.accordionItems[idx].content = contentInput.value;
				render();
				return;
			}
			const disCheck = event.target.closest('.props-accordion-dis-check');
			if (disCheck) {
				const block = resolveEditableBlockData(disCheck.dataset.blockId);
				const idx = Number(disCheck.dataset.itemIdx);
				if (!block || !block.accordionItems || !block.accordionItems[idx]) return;
				pushHistory();
				block.accordionItems[idx].disabled = disCheck.checked;
				render();
				return;
			}
		});
		accordionItemsContainer.addEventListener('click', event => {
			const btn = event.target.closest('.props-accordion-remove-btn');
			if (!btn || btn.disabled) return;
			const block = resolveEditableBlockData(btn.dataset.blockId);
			const idx = Number(btn.dataset.itemIdx);
			if (!block || !block.accordionItems || block.accordionItems.length <= 1) return;
			pushHistory();
			block.accordionItems.splice(idx, 1);
			render();
			renderPropsAccordionItems(block);
		});
	}

	// discloser: title change
	document.getElementById('propDiscloserTitle')?.addEventListener('input', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'accordion-03') return;
		block.discloserTitle = this.value;
		render();
	});

	// discloser: content change
	document.getElementById('propDiscloserContent')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || block.type !== 'accordion-03') return;
		pushHistory();
		block.discloserContent = this.value;
		render();
	});

	// Keep the panel stable after render cycles.
	const canvasGridEl = document.getElementById('canvasGrid');
	if (canvasGridEl) {
		const panelObserver = new MutationObserver(() => {
			if (!_propsBlockId) return;
			const b = resolveBlockForRows(_propsBlockId);
			if (!b) return;
			if (templateCategories[b.type] === 'accordion') {
				const accSection = document.getElementById('propsAccordionSection');
				if (!accSection || accSection.style.display === 'none') return;
				renderPropsAccordionItems(b);
			} else if (templateCategories[b.type] === 'table') {
				const tblSection = document.getElementById('propsTableSection');
				if (!tblSection || tblSection.style.display === 'none') return;
				renderPropsTableSection(b);
			}
		});
		panelObserver.observe(canvasGridEl, { childList: true });
	}

	// table: column count change
	document.getElementById('propsOpenTableDraw')?.addEventListener('click', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'table') return;
		openTableDrawPopover(block.id);
	});

	document.getElementById('propTableColCount')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'table') return;
		const newCount = Math.max(1, Math.min(12, Number(this.value) || 4));
		this.value = newCount;
		const oldCount = block.tableColCount || 4;
		if (newCount === oldCount) return;
		pushHistory();
		block.tableColCount = newCount;
		block.tableColWidths = Array.from({ length: newCount }, (_, i) => `${Math.round(100 / newCount)}%`);
		_syncTableCellKeys(block, oldCount, newCount);
		render();
		renderPropsTableSection(block);
	});

	// table: column width mode change
	document.getElementById('propTableColWidthMode')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'table') return;
		pushHistory();
		block.tableColWidthMode = this.value;
		if (this.value === 'manual') {
			const n = block.tableColCount || 4;
			block.tableColWidths = Array.from({ length: n }, () => `${Math.round(100 / n)}%`);
		}
		render();
		renderPropsTableSection(block);
	});

	document.getElementById('propTableScroll')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'table') return;
		pushHistory();
		block.tableScroll = this.value;
		render();
	});

	document.getElementById('propsApplyTableColWidths')?.addEventListener('click', () => {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || templateCategories[block.type] !== 'table') return;
		const inputs = document.querySelectorAll('#propsTableColWidthsContainer .props-table-col-width-input');
		const nums = [];
		let total = 0;
		let valid = true;
		inputs.forEach(input => {
			const val = parseFloat(input.value.trim());
			if (isNaN(val) || val <= 0) { valid = false; return; }
			nums.push(val);
			total += val;
		});
		const notice = document.getElementById('propsTableColWidthsNotice');
		if (!valid || Math.abs(total - 100) > 0.1) {
			if (notice) notice.style.display = '';
			return;
		}
		if (notice) notice.style.display = 'none';
		pushHistory();
		block.tableColWidths = nums.map(w => `${w}%`);
		render();
	});

	const tableStructureContainer = document.getElementById('propsTableStructure');
	if (tableStructureContainer) {
		tableStructureContainer.addEventListener('click', event => {
			const addSectionBtn = event.target.closest('.props-table-add-section-btn');
			if (addSectionBtn) {
				const blockId = addSectionBtn.dataset.blockId;
				const sectionTag = addSectionBtn.dataset.section;
				const block = state.blocks.find(b => b.id === blockId);
				if (!block) return;
				pushHistory();
				_addTableSection(block, sectionTag);
				render();
				renderPropsTableSection(block);
				return;
			}

			const removeSectionBtn = event.target.closest('.props-table-remove-section-btn, .props-table-remove-section-check');
			if (removeSectionBtn) {
				const blockId = removeSectionBtn.dataset.blockId;
				const sectionTag = removeSectionBtn.dataset.removeSection;
				const block = state.blocks.find(b => b.id === blockId);
				if (!block) return;
				pushHistory();
				_removeTableSection(block, sectionTag);
				render();
				renderPropsTableSection(block);
				return;
			}

			const addTrBtn = event.target.closest('[data-add-tr]');
			if (addTrBtn) {
				const blockId = addTrBtn.dataset.blockId;
				const sectionTag = addTrBtn.dataset.addTr;
				const block = state.blocks.find(b => b.id === blockId);
				if (!block) return;
				pushHistory();
				_addTableRow(block, sectionTag);
				render();
				renderPropsTableSection(block);
				return;
			}

			// tr ?쒓굅
			const removeTrBtn = event.target.closest('.props-table-tr-remove-btn');
			if (removeTrBtn && !removeTrBtn.disabled) {
				const blockId = removeTrBtn.dataset.blockId;
				const sectionTag = removeTrBtn.dataset.section;
				const rowKey = removeTrBtn.dataset.rowKey;
				const block = state.blocks.find(b => b.id === blockId);
				if (!block) return;
				pushHistory();
				_removeTableRow(block, sectionTag, rowKey);
				render();
				renderPropsTableSection(block);
				return;
			}

			const cellTagBtn = event.target.closest('.props-table-cell-tag-btn');
			if (cellTagBtn) {
				const blockId = cellTagBtn.dataset.blockId;
				const rowKey = cellTagBtn.dataset.rowKey;
				const colIdx = parseInt(cellTagBtn.dataset.colIdx);
				const sectionTag = cellTagBtn.dataset.section;
				if (sectionTag === 'thead') return;
				const block = state.blocks.find(b => b.id === blockId);
				if (!block) return;
				const rowsKey = getTableRowsKey(sectionTag);
				const row = (block[rowsKey] || []).find(r => r.key === rowKey);
				if (!row) return;
				const colCount = block.tableColCount || 4;
				const defaultTag = sectionTag === 'tfoot' ? 'th' : 'td';
				if (!row.cellTags) row.cellTags = Array(colCount).fill(defaultTag);
				pushHistory();
				row.cellTags[colIdx] = (row.cellTags[colIdx] || defaultTag) === 'th' ? 'td' : 'th';
				render();
				renderPropsTableSection(block);
				return;
			}

			const zoneBtn = event.target.closest('.props-mini-cell-zone-btn');
			if (zoneBtn) {
				const blockId = zoneBtn.dataset.blockId;
				const cellKey = zoneBtn.dataset.cellKey;
				const block = state.blocks.find(b => b.id === blockId);
				if (!block) return;
				toggleTableCellBlockZone(blockId, cellKey);
				return;
			}

			const alignBtn = event.target.closest('.props-table-align-btn');
			if (alignBtn) {
				const blockId = alignBtn.dataset.blockId;
				const sectionTag = alignBtn.dataset.section;
				const rowKey = alignBtn.dataset.rowKey;
				const cellType = alignBtn.dataset.cellType;
				const align = alignBtn.dataset.align;
				const block = state.blocks.find(b => b.id === blockId);
				if (!block) return;
				const rowsKey = sectionTag === 'thead' ? 'tableTheadRows' : sectionTag === 'tfoot' ? 'tableTfootRows' : 'tableTbodyRows';
				const rows = block[rowsKey] || [];
				pushHistory();
				if (cellType === 'all') {
					const allActive = rows.length > 0 && rows.every(row => {
						const thActive = (row.thAlign || '') === align;
						const tdActive = sectionTag === 'tbody' ? (row.tdAlign || '') === align : true;
						return thActive && tdActive;
					});
					rows.forEach(row => {
						row.thAlign = allActive ? '' : align;
						if (sectionTag === 'tbody') row.tdAlign = allActive ? '' : align;
					});
				} else if (rowKey === '__all__') {
					const alignProp = cellType === 'th' ? 'thAlign' : 'tdAlign';
					const allActive = rows.length > 0 && rows.every(row => (row[alignProp] || '') === align);
					rows.forEach(row => { row[alignProp] = allActive ? '' : align; });
				} else {
					const row = rows.find(r => r.key === rowKey);
					if (!row) return;
					const alignProp = cellType === 'th' ? 'thAlign' : 'tdAlign';
					row[alignProp] = row[alignProp] === align ? '' : align;
				}
				render();
				renderPropsTableSection(block);
				return;
			}
		});

	}

	document.getElementById('tableCellSpanApply')?.addEventListener('click', applyTableCellSpan);
	document.addEventListener('mousedown', e => {
		const popover = document.getElementById('tableCellSpanPopover');
		if (!popover || popover.style.display === 'none') return;
		if (popover.contains(e.target)) return;
		if (e.target.closest && e.target.closest('table [data-edit-field]')) return;
		closeTableCellSpanPopover();
	});

	document.getElementById('propNlLogoFile')?.addEventListener('change', function () {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || !/^newsletter-\d+__section_1$/.test(block.type)) return;
		const file = this.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		const reader = new FileReader();
		reader.onload = () => {
			pushHistory();
			block.nlLogoSrc = String(reader.result || '');
			const schoolNameInput = document.getElementById('propNlSchoolName');
			block.nlLogoAlt = (schoolNameInput?.value.trim()) || '학교 로고';
			render();
		};
		reader.readAsDataURL(file);
	});

	document.getElementById('propsApplyNlHeader')?.addEventListener('click', () => {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || !/^newsletter-\d+__section_1$/.test(block.type)) return;
		const schoolName = document.getElementById('propNlSchoolName')?.value.trim() || '';
		const dept = document.getElementById('propNlDept')?.value.trim() || '';
		const phone = document.getElementById('propNlPhone')?.value.trim() || '';
		pushHistory();
		if (!block.items[0]) block.items[0] = {};
		if (schoolName) block.items[0].schoolName = schoolName;
		block.items[0].dept = dept;
		block.items[0].phone = phone;
		if (block.nlLogoSrc) block.nlLogoAlt = schoolName || '학교 로고';
		render();
	});


	document.getElementById('propNlBodyFontSize')?.addEventListener('change', () => {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		if (!block || !/^newsletter-\d+__section_1$/.test(block.type)) return;
		const val = parseInt(document.getElementById('propNlBodyFontSize')?.value) || 15;
		pushHistory();
		block.nlContentFontSize = Math.max(12, Math.min(30, val));
		render();
	});

	document.getElementById('propNlBodyFsDown')?.addEventListener('click', () => {
		const input = document.getElementById('propNlBodyFontSize');
		if (!input) return;
		const cur = parseInt(input.value) || 19;
		if (cur > 12) { input.value = cur - 1; input.dispatchEvent(new Event('change')); }
	});

	document.getElementById('propNlBodyFsUp')?.addEventListener('click', () => {
		const input = document.getElementById('propNlBodyFontSize');
		if (!input) return;
		const cur = parseInt(input.value) || 19;
		if (cur < 30) { input.value = cur + 1; input.dispatchEvent(new Event('change')); }
	});

	document.getElementById('propsApplyNlFooter')?.addEventListener('click', () => {
		if (!_propsBlockId) return;
		const block = resolveEditableBlockData(_propsBlockId);
		const _isNlFooterBlock = /^newsletter-\d+__section_4$/.test(block.type) ||
			(/^newsletter-\d+__section_1$/.test(block.type) && !!componentTemplates[block.type]?.element?.querySelector('.nl-footer-section'));
		if (!block || !_isNlFooterBlock) return;
		const year = document.getElementById('propNlYear')?.value.trim() || '';
		const month = document.getElementById('propNlMonth')?.value.trim() || '';
		const day = document.getElementById('propNlDay')?.value.trim() || '';
		const school = document.getElementById('propNlFooterSchool')?.value.trim() || '';
		const stamp = document.getElementById('propNlStamp')?.value || 'omit';
		pushHistory();
		if (!block.items[0]) block.items[0] = {};
		block.items[0].nlYear = year;
		block.items[0].nlMonth = month;
		block.items[0].nlDay = day;
		block.items[0].nlFooterSchool = school;
		block.items[0].nlStamp = stamp;
		const yr = year || '20';
		const mo = month || '';
		const dy = day || '';
		const dateParts = [
			`${yr}&nbsp;년`,
			mo ? `${mo}&nbsp;월` : '&nbsp;&nbsp;&nbsp;&nbsp;월',
			dy ? `${dy}&nbsp;일` : '&nbsp;&nbsp;&nbsp;&nbsp;일'
		];
		block.items[0].date = dateParts.join('&nbsp;&nbsp;&nbsp;');
		const schoolName = school || '○○학교';
		const stampText = stamp === 'use' ? '(직인)' : '(직인 생략)';
		block.items[0].principal = `${schoolName}&nbsp;${stampText}`;
		render();
	});

}

const MIX_ALLOWED = new Set(['box', 'list', 'title-horizontal', 'title-vertical', 'divider', 'text', 'title', 'button']);

function isMixContainer(type) {
	if (templateCategories[type] === 'mix') return true;
	const t = componentTemplates[type];
	return !!(t && t.element.querySelector('.mix-inner-slot'));
}


function renderPropsProcessSteps(block) {
	const container = document.getElementById('propsProcessStepsContainer');
	if (!container) return;
	const items = block.items || [];
	const minItems = 2;
	const isVerti = block.type === 'process-02';
	container.innerHTML = items.map((item, idx) => {
		const rawTitle = (item.title || '').replace(/<[^>]+>/g, '').slice(0, 14) || `단계 ${idx + 1}`;
		const isFin = idx === items.length - 1;
		const canRemove = isVerti && items.length > minItems;
		const subVal = (item.sub || '').replace(/<[^>]+>/g, '');
		return `<div class="props-list-row">
			<span class="props-list-row-dot"></span>
			<span class="props-list-row-text" style="flex-shrink:0;min-width:3.5rem">${escapeHtml(rawTitle)}${isFin ? '<em>*</em>' : ''}</span>
			<input type="text" class="props-input props-process-sub-input" style="flex:1;min-width:0"
				data-block-id="${block.id}" data-step-idx="${idx}"
				placeholder="설명 입력" value="${escapeAttr(subVal)}">
			${canRemove ? `<button type="button" class="props-list-row-remove-btn props-process-step-remove-btn" data-block-id="${block.id}" data-step-idx="${idx}" title="단계 삭제"><i class="ri-subtract-line"></i></button>` : ''}
		</div>`;
	}).join('');
}

function _syncProcessStepTitles(block) {
	(block.items || []).forEach((item, idx) => {
		if (/^단계\s*\d+$/.test((item.title || '').trim())) {
			item.title = `단계 ${idx + 1}`;
		}
	});
}

function addProcessStep(blockId) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'process') return;
	pushHistory();
	block.items.push({
		title: `단계 ${block.items.length + 1}`,
		sub: '',
		style: createStyleForType(block.type),
		innerBlocks: []
	});
	_syncProcessStepTitles(block);
	render();
	openBlockProps(blockId);
}

function removeProcessStep(blockId, stepIdx) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'process') return;
	if (block.items.length <= 2) return;
	pushHistory();
	block.items.splice(stepIdx, 1);
	_syncProcessStepTitles(block);
	render();
	openBlockProps(blockId);
}

function addProcessStepInnerBlock(blockId, stepIdx, innerType) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const item = block.items[stepIdx];
	if (!item) return;
	const innerTemplate = componentTemplates[innerType];
	if (!innerTemplate) return;
	pushHistory();
	const innerData = innerTemplate.getDefaultData ? innerTemplate.getDefaultData() : {};
	if (!Array.isArray(item.innerBlocks)) item.innerBlocks = [];
	const newIbIdx = item.innerBlocks.length;
	item.innerBlocks.push({
		type: innerType,
		marginBottom: 10,
		items: [{ ...cloneData(innerData), style: createStyleForType(innerType) }]
	});
	if (templateCategories[innerType] === 'list') {
		ensureListRows({ id: `${blockId}::pstep::${stepIdx}::inner::${newIbIdx}`, type: innerType, items: item.innerBlocks[newIbIdx].items });
	}
	render();
	selectBlock(blockId);
}

function addProcessStepInnerBlockFromExisting(blockId, stepIdx, sourceBlockId) {
	const block = state.blocks.find(b => b.id === blockId);
	const sourceBlock = state.blocks.find(b => b.id === sourceBlockId);
	if (!block || !sourceBlock) return;
	if (!MIX_ALLOWED.has(templateCategories[sourceBlock.type])) return;
	const item = block.items[stepIdx];
	if (!item) return;
	pushHistory();
	if (!Array.isArray(item.innerBlocks)) item.innerBlocks = [];
	item.innerBlocks.push({
		type: sourceBlock.type,
		marginBottom: sourceBlock.marginBottom ?? 10,
		blockIndent: !!sourceBlock.blockIndent,
		items: cloneData(sourceBlock.items || [])
	});
	state.blocks = state.blocks.filter(b => b.id !== sourceBlockId);
	render();
	selectBlock(blockId);
}

function removeProcessStepInnerBlock(blockId, stepIdx, innerIdx) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const item = block.items[stepIdx];
	if (!item || !Array.isArray(item.innerBlocks)) return;
	pushHistory();
	item.innerBlocks.splice(innerIdx, 1);
	render();
	selectBlock(blockId);
}

function toggleTableCellBlockZone(blockId, cellKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistory();
	if (!block.tableCellBlockZones) block.tableCellBlockZones = {};
	if (block.tableCellBlockZones[cellKey]) {
		clearTableCellBlockZone(block, cellKey);
	} else {
		block.tableCellBlockZones[cellKey] = true;
		// Clear existing text data when the cell becomes a block zone.
		(block.items || []).forEach(item => { if (cellKey in item) item[cellKey] = ''; });
	}
	render();
	renderPropsTableSection(block);
}

function addTableCellInnerBlock(blockId, cellKey, innerType) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const innerTemplate = componentTemplates[innerType];
	if (!innerTemplate) return;
	pushHistory();
	const innerData = innerTemplate.getDefaultData ? innerTemplate.getDefaultData() : {};
	if (!block.tableCellInnerBlocks) block.tableCellInnerBlocks = {};
	block.tableCellInnerBlocks[cellKey] = {
		type: innerType,
		marginBottom: 10,
		items: [{ ...cloneData(innerData), style: createStyleForType(innerType) }]
	};
	if (templateCategories[innerType] === 'list') {
		ensureListRows({ id: `${blockId}::tcell::${cellKey}`, type: innerType, items: block.tableCellInnerBlocks[cellKey].items });
	}
	state.dragPayload = '';
	render();
	renderPropsTableSection(block);
}

function addTableCellInnerBlockFromExisting(blockId, cellKey, sourceBlockId) {
	const block = state.blocks.find(b => b.id === blockId);
	const sourceBlock = state.blocks.find(b => b.id === sourceBlockId);
	if (!block || !sourceBlock) return;
	if (!MIX_ALLOWED.has(templateCategories[sourceBlock.type])) return;
	pushHistory();
	if (!block.tableCellInnerBlocks) block.tableCellInnerBlocks = {};
	block.tableCellInnerBlocks[cellKey] = {
		...cloneData(sourceBlock),
		id: undefined,
		type: sourceBlock.type,
		marginBottom: sourceBlock.marginBottom ?? 10,
		blockIndent: !!sourceBlock.blockIndent,
		items: cloneData(sourceBlock.items || [])
	};
	state.blocks = state.blocks.filter(b => b.id !== sourceBlockId);
	state.dragPayload = '';
	render();
	renderPropsTableSection(block);
}

function removeTableCellInnerBlock(blockId, cellKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.tableCellInnerBlocks?.[cellKey]) return;
	pushHistory();
	delete block.tableCellInnerBlocks[cellKey];
	if (cellKey.includes('__slot')) delete block.tableCellBlockZones?.[cellKey];
	render();
	renderPropsTableSection(block);
}

function moveProcessStepInnerBlock(blockId, stepIdx, fromIdx, toIdx) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const item = block.items[stepIdx];
	if (!item || !Array.isArray(item.innerBlocks)) return;
	if (fromIdx < 0 || toIdx < 0 || fromIdx >= item.innerBlocks.length || toIdx >= item.innerBlocks.length) return;
	pushHistory();
	const [moved] = item.innerBlocks.splice(fromIdx, 1);
	item.innerBlocks.splice(toIdx, 0, moved);
	render();
	selectBlock(blockId);
}

function addMixInnerBlock(blockId, innerType) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const innerTemplate = componentTemplates[innerType];
	if (!innerTemplate) return;
	pushHistory();
	const innerData = innerTemplate.getDefaultData ? innerTemplate.getDefaultData() : {};
	if (!Array.isArray(block.innerBlocks)) block.innerBlocks = [];
	const newIb = {
		type: innerType,
		marginBottom: 10,
		items: [{ ...cloneData(innerData), style: createStyleForType(innerType) }]
	};
	if (block.type === 'button-00' && templateCategories[innerType] === 'button') {
		newIb.btnSize = '';
		newIb.btnOpenType = 'default';
		if (innerType === 'button-05' || innerType === 'button-06') newIb.btnIcon = 'ri-external-link-line';
		if (innerType === 'button-05') newIb.btnIconPos = 'before';
	}
	block.innerBlocks.push(newIb);
	render();
	if (block.type === 'button-00' && _propsBlockId === blockId) {
		openBlockProps(blockId);
	} else {
		selectBlock(blockId);
	}
}

// Change the order of inner blocks in a mixed block.
function moveMixInnerBlock(blockId, fromIdx, toIdx) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !Array.isArray(block.innerBlocks)) return;
	if (fromIdx < 0 || toIdx < 0 || fromIdx >= block.innerBlocks.length || toIdx >= block.innerBlocks.length) return;
	pushHistory();
	const [moved] = block.innerBlocks.splice(fromIdx, 1);
	block.innerBlocks.splice(toIdx, 0, moved);
	render();
	selectBlock(blockId);
}

function addMixInnerBlockFromExisting(mixBlockId, sourceBlockId) {
	const mixBlock = state.blocks.find(b => b.id === mixBlockId);
	const sourceBlock = state.blocks.find(b => b.id === sourceBlockId);
	if (!mixBlock || !sourceBlock) return;
	if (!MIX_ALLOWED.has(templateCategories[sourceBlock.type])) return;
	pushHistory();
	if (!Array.isArray(mixBlock.innerBlocks)) mixBlock.innerBlocks = [];
	const movedIb = {
		type: sourceBlock.type,
		marginBottom: sourceBlock.marginBottom ?? 10,
		blockIndent: !!sourceBlock.blockIndent,
		items: cloneData(sourceBlock.items || [])
	};
	if (mixBlock.type === 'button-00' && templateCategories[sourceBlock.type] === 'button') {
		movedIb.btnSize = sourceBlock.btnSize || '';
		movedIb.btnOpenType = sourceBlock.btnOpenType || 'default';
		movedIb.btnIcon = sourceBlock.btnIcon || 'ri-external-link-line';
		movedIb.btnIconPos = sourceBlock.btnIconPos || 'before';
	}
	mixBlock.innerBlocks.push(movedIb);
	state.blocks = state.blocks.filter(b => b.id !== sourceBlockId);
	render();
	selectBlock(mixBlockId);
}

function removeMixInnerBlock(blockId, innerIdx) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !Array.isArray(block.innerBlocks)) return;
	pushHistory();
	block.innerBlocks.splice(innerIdx, 1);
	render();
	selectBlock(blockId);
}

function setListWrapBlock(listWrapId, type) {
	const m = typeof listWrapId === 'string' && listWrapId.match(/^(.+)::list::(\d+)$/);
	if (!m) return;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	if (!outerBlock) return;
	const colIdx = parseInt(m[2], 10);
	if (!outerBlock.items[colIdx]) return;
	const innerTemplate = componentTemplates[type];
	if (!innerTemplate) return;
	pushHistory();
	const innerData = innerTemplate.getDefaultData ? innerTemplate.getDefaultData() : {};
	outerBlock.items[colIdx].listBlock = {
		type,
		columns: 1,
		items: [{ ...cloneData(innerData), style: createStyleForType(type) }]
	};
	render();
	selectBlock(m[1]);
}

function setListWrapFromExisting(listWrapId, sourceBlockId) {
	const m = typeof listWrapId === 'string' && listWrapId.match(/^(.+)::list::(\d+)$/);
	if (!m) return;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	const sourceBlock = state.blocks.find(b => b.id === sourceBlockId);
	if (!outerBlock || !sourceBlock) return;
	const colIdx = parseInt(m[2], 10);
	if (!outerBlock.items[colIdx]) return;
	if (templateCategories[sourceBlock.type] !== 'list') return;
	pushHistory();
	outerBlock.items[colIdx].listBlock = { type: sourceBlock.type, columns: sourceBlock.items.length || 1, items: cloneData(sourceBlock.items || []) };
	state.blocks = state.blocks.filter(b => b.id !== sourceBlockId);
	render();
	selectBlock(m[1]);
}

function clearListWrapBlock(listWrapId) {
	const m = typeof listWrapId === 'string' && listWrapId.match(/^(.+)::list::(\d+)$/);
	if (!m) return;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	const colIdx = parseInt(m[2], 10);
	if (!outerBlock || !outerBlock.items[colIdx]) return;
	pushHistory();
	outerBlock.items[colIdx].listBlock = null;
	render();
	selectBlock(blockId);
}

function updateBlockUseList(blockId, useList) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistory();
	block.useList = useList;
	render();
	selectBlock(blockId);
}

function duplicateBlock(blockId) {
	duplicateBlockAt(blockId, blockId, 'after');
}

function duplicateBlockAt(blockId, targetBlockId, position = 'after') {
	if (_duplicatingBlock) return;
	const index = state.blocks.findIndex(b => b.id === blockId);
	if (index < 0) return;
	_duplicatingBlock = true;
	pushHistory();
	const cloned = cloneData(state.blocks[index]);
	cloned.id = `block-${state.nextBlockId++}`;
	const targetIndex = targetBlockId
		? state.blocks.findIndex(b => b.id === targetBlockId)
		: state.blocks.length - 1;
	if (targetIndex >= 0) {
		state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, cloned);
	} else {
		state.blocks.push(cloned);
	}
	render();
	_duplicatingBlock = false;
	const newEl = canvasGrid.querySelector(`[data-block-id="${cloned.id}"]`);
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	selectBlock(cloned.id);
}

function updateBlockColumns(blockId, count) {
	const listRef = resolveListInnerRef(blockId);
	if (listRef) {
		const { listBlock } = listRef;
		pushHistory();
		listBlock.columns = Number(count) || 1;
		syncListBlockItems(listBlock);
		render();
		return;
	}
	const block = state.blocks.find(item => item.id === blockId);
	if (!block) return;
	pushHistory();
	block.columns = Number(count) || 1;
	syncBlockItems(block);
	render();
}

function syncBlockItems(block) {
	const template = componentTemplates[block.type];
	const source = block.items[0] || (template.getDefaultData ? template.getDefaultData() : {});
	const hasTitleListWrap = templateCategories[block.type] === 'title-list' && template.element?.querySelector('.list-wrap');
	const isProcess = templateCategories[block.type] === 'process';
	while (block.items.length < block.columns) {
		const newItem = { ...cloneData(source), style: createStyleForType(block.type) };
		if (hasTitleListWrap) newItem.listBlock = null;
		if (isProcess) newItem.innerBlocks = [];
		block.items.push(newItem);
	}
	if (block.items.length > block.columns) block.items = block.items.slice(0, block.columns);
}

function syncListBlockItems(listBlock) {
	const template = componentTemplates[listBlock.type];
	const source = listBlock.items[0] || (template?.getDefaultData ? template.getDefaultData() : {});
	while (listBlock.items.length < listBlock.columns) {
		listBlock.items.push({ ...cloneData(source), style: createStyleForType(listBlock.type) });
	}
	if (listBlock.items.length > listBlock.columns) listBlock.items = listBlock.items.slice(0, listBlock.columns);
}

async function clearCanvas() {
	if (!state.blocks.length && !state.overlays.length) return;
	const ok = await showConfirmModal({
		title: '캔버스를 초기화할까요?',
		message: '모든 블록과 꾸밈 요소가 삭제됩니다.\n이 작업은 실행취소로 되돌릴 수 없습니다.',
		confirmText: '확인',
		cancelText: '취소'
	});
	if (!ok) return;
	pushHistory();
	state.blocks = [];
	state.nextBlockId = 1;
	state.dragPayload = '';
	state.overlays = [];
	state.selectedItem = null;
	renderOverlayItems();
	render();
}

function showConfirmModal({ title, message, confirmText = '확인', cancelText = '취소' }) {
	return new Promise(resolve => {
		const layer = document.createElement('div');
		layer.className = 'klic-confirm-layer';
		layer.innerHTML = `
			<div class="klic-confirm-backdrop" data-confirm-cancel></div>
			<div class="klic-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="klicConfirmTitle">
				<div class="klic-confirm-icon"><i class="ri-error-warning-line" aria-hidden="true"></i></div>
				<strong id="klicConfirmTitle">${escapeHtml(title)}</strong>
				<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
				<div class="klic-confirm-actions">
					<button type="button" class="ghost-button" data-confirm-cancel>${escapeHtml(cancelText)}</button>
					<button type="button" class="primary-button" data-confirm-ok>${escapeHtml(confirmText)}</button>
				</div>
			</div>`;
		const close = value => {
			document.removeEventListener('keydown', onKeydown);
			layer.remove();
			resolve(value);
		};
		const onKeydown = event => {
			if (event.key === 'Escape') close(false);
		};
		layer.querySelectorAll('[data-confirm-cancel]').forEach(el => el.addEventListener('click', () => close(false)));
		layer.querySelector('[data-confirm-ok]')?.addEventListener('click', () => close(true));
		document.addEventListener('keydown', onKeydown);
		document.body.appendChild(layer);
		layer.querySelector('[data-confirm-ok]')?.focus();
	});
}

function getTemplateBasePath(id) {
	return templateBasePaths[id] || `${TEMPLATE_DIR}${id}`;
}

function getThumbUrl(templateId) {
	return `${getTemplateBasePath(templateId)}/screenshot.png`;
}

function renderComponentList() {
	const templates = Object.values(componentTemplates).filter(template => {
		const category = templateCategories[template.id] || 'box';
		if (category === 'design-template') return false;
		if (category === 'design-template-section') return false;
		if (!isBlockCategoryVisible(category)) return false;
		if (state.templateFilter === 'all') return true;
		return category === state.templateFilter;
	});

	if (!templates.length) {
		componentList.classList.add('is-empty-state');
		componentList.innerHTML = '<p class="template-empty">등록된 템플릿이 없습니다.</p>';
		bindComponentEvents(componentList);
		return;
	}

	componentList.classList.remove('is-empty-state');
	componentList.innerHTML = templates.map(t => `
		<div class="component-item${t.isInline ? ' component-item--inline' : ''}" draggable="true" data-type="${t.id}">
			<div class="component-thumb component-thumb--loading" aria-hidden="true"></div>
			<span class="component-name">${escapeHtml(t.name)}</span>
			<button type="button" class="component-add-btn" aria-label="${escapeHtml(t.name)} 추가">
				<i class="ri-add-line" aria-hidden="true"></i>
			</button>
		</div>`).join('');
	bindComponentEvents(componentList);

	for (const template of templates) {
		const item = componentList.querySelector(`[data-type="${template.id}"]`);
		if (!item) continue;
		const thumb = item.querySelector('.component-thumb');
		thumb.classList.remove('component-thumb--loading');
		if ((templateCategories[template.id] || '') === 'mix') {
			thumb.innerHTML = `<div class="mix-thumb-placeholder">이미지 없음</div>`;
		} else {
			const img = document.createElement('img');
			img.src = getThumbUrl(template.id);
			img.alt = template.id;
			img.className = 'component-thumb-img';
			img.onerror = () => {
				thumb.innerHTML = '<div class="mix-thumb-placeholder">이미지 없음</div>';
			};
			thumb.appendChild(img);
		}
	}
}


let _designBlockTemplates = null;
let _activeDesignBlockFilter = 'all';
let _designBlockLoadPromise = null;
const _designBlockCategories = new Map();

function ensureDesignBlockPanelLoaded() {
	if (_designBlockTemplates) {
		renderDesignBlockList(_activeDesignBlockFilter);
		return Promise.resolve();
	}
	if (_designBlockLoadPromise) return _designBlockLoadPromise;
	_designBlockLoadPromise = loadAndRenderDesignBlocksPanel().finally(() => {
		_designBlockLoadPromise = null;
	});
	return _designBlockLoadPromise;
}

async function loadAndRenderDesignBlocksPanel() {
	const manifest = TEMPLATE2_BUILDER_CONFIG.designBlockManifest;
	if (!manifest) return;
	const designBlockList = document.getElementById('designBlockList');
	if (!designBlockList) return;
	try {
		const entries = await fetchTemplateManifest(manifest, true);
		const paths = entries.flat ? entries.flat() : entries;
		const loaded = await Promise.all(paths.map(entry => {
			const path = typeof entry === 'string' ? normalizeTemplatePath(entry) : null;
			if (!path) return null;
			const id = inferCntBuilderTemplateId(path);
			const category = inferCntBuilderTemplateCategory(path);
			if (!id || !TEMPLATE_BUILDER_DESIGN_BLOCK_CATEGORIES.has(category)) return null;
			_designBlockCategories.set(id, category);
			if (id && category) {
				templateCategories[id] = category;
				templateBasePaths[id] = normalizeTemplateFolder(path.replace(/\/?index\.html$/i, '').replace(/\/[^/]+\.[^.]+$/i, ''));
			}
			return loadHtmlTemplate(path).then(t => {
				componentTemplates[t.id] = t;
				return t;
			}).catch(() => null);
		}));
		_designBlockTemplates = loaded.filter(Boolean);
		renderDesignBlockList(_activeDesignBlockFilter);
	} catch (e) {
		if (designBlockList) designBlockList.innerHTML = `<p class="template-error">${escapeHtml(e.message)}</p>`;
	}
}

function renderDesignBlockList(filter) {
	_activeDesignBlockFilter = filter || 'all';
	const designBlockList = document.getElementById('designBlockList');
	if (!designBlockList || !_designBlockTemplates) return;
	const activeFilter = TEMPLATE_BUILDER_DESIGN_BLOCK_CATEGORIES.has(_activeDesignBlockFilter) ? _activeDesignBlockFilter : 'all';
	const filtered = _designBlockTemplates.filter(t => {
		const cat = _designBlockCategories.get(t.id) || '';
		return activeFilter === 'all' || cat === activeFilter;
	});
	if (!filtered.length) {
		designBlockList.innerHTML = '<p class="template-empty">등록된 블록이 없습니다.</p>';
		return;
	}
	designBlockList.innerHTML = filtered.map(t => `
		<div class="component-item" draggable="true" data-type="${t.id}" data-design-category="${_designBlockCategories.get(t.id) || ''}">
			<div class="component-thumb component-thumb--loading" aria-hidden="true"></div>
			<span class="component-name">${escapeHtml(t.name)}</span>
			<button type="button" class="component-add-btn" aria-label="${escapeHtml(t.name)} 추가">
				<i class="ri-add-line" aria-hidden="true"></i>
			</button>
		</div>`).join('');
	bindComponentEvents(designBlockList);
	for (const t of filtered) {
		const item = designBlockList.querySelector(`[data-type="${t.id}"]`);
		if (!item) continue;
		const thumb = item.querySelector('.component-thumb');
		thumb.classList.remove('component-thumb--loading');
		const img = document.createElement('img');
		img.src = getThumbUrl(t.id);
		img.alt = t.id;
		img.className = 'component-thumb-img';
		img.onerror = () => { thumb.innerHTML = '<div class="mix-thumb-placeholder">이미지 없음</div>'; };
		thumb.appendChild(img);
	}
	applyDesignBlockDomFilter(activeFilter);
}

function applyDesignBlockDomFilter(filter) {
	const designBlockList = document.getElementById('designBlockList');
	if (!designBlockList) return;
	const activeFilter = TEMPLATE_BUILDER_DESIGN_BLOCK_CATEGORIES.has(filter) ? filter : 'all';
	designBlockList.querySelectorAll('.component-item[data-design-category]').forEach(item => {
		const visible = activeFilter === 'all' || item.dataset.designCategory === activeFilter;
		item.hidden = !visible;
		item.classList.toggle('is-filter-hidden', !visible);
	});
}

function bindDesignBlockPanelEvents() {
	const filters = document.getElementById('designBlockFilters');
	if (filters && filters.dataset.designBlockBound !== 'true') {
		filters.dataset.designBlockBound = 'true';
		const activateDesignBlockFilter = event => {
			const btn = event.target.closest('[data-design-block-filter]');
			if (!btn || !filters.contains(btn)) return;
			event.preventDefault();
			event.stopPropagation();
			_activeDesignBlockFilter = btn.dataset.designBlockFilter || 'all';
			filters.querySelectorAll('[data-design-block-filter]').forEach(filterBtn => {
				filterBtn.classList.toggle('is-active', filterBtn === btn);
				filterBtn.setAttribute('aria-pressed', filterBtn === btn ? 'true' : 'false');
			});
			if (_designBlockTemplates) {
				renderDesignBlockList(_activeDesignBlockFilter);
				applyDesignBlockDomFilter(_activeDesignBlockFilter);
			}
			else ensureDesignBlockPanelLoaded();
		};
		filters.addEventListener('pointerup', activateDesignBlockFilter, true);
		filters.addEventListener('click', activateDesignBlockFilter, true);
	}

	if (document.querySelector('[data-sidebar-tab="design-blocks"].is-active')) {
		ensureDesignBlockPanelLoaded();
	}
}

function getDesignTemplateSubCategory(id) {
	if (/^principal-/.test(id)) return 'principal';
	if (/^greeting-/.test(id)) return 'greeting';
	if (/^work-/.test(id)) return 'work';
	if (/^symbol-/.test(id)) return 'symbol';
	if (/^school-song-/.test(id) || /^schoolSong-/.test(id)) return 'schoolSong';
	if (/^newsletter-/.test(id)) return 'family-letter';
	if (/^privacy-/.test(id)) return 'privacy';
	return 'other';
}

function switchDesignTemplateFilter(filterValue) {
	state.designTemplateFilter = filterValue;
	document.querySelectorAll('[data-design-template-filter]').forEach(b => {
		b.classList.toggle('is-active', b.dataset.designTemplateFilter === filterValue);
	});
	renderCustomPanel();
}

function renderCustomPanel() {
	const customList = document.getElementById('customTemplateList');
	if (!customList) return;

	const filter = state.designTemplateFilter || 'all';
	const templates = Object.values(componentTemplates).filter(t => {
		if ((templateCategories[t.id] || '') !== 'design-template') return false;
		if (!isDesignTemplateVisible(t)) return false;
		if (filter === 'all') return true;
		return getDesignTemplateSubCategory(t.id) === filter;
	});

	if (!templates.length) {
		customList.classList.add('is-empty-state');
		customList.innerHTML = '<p class="template-empty">커스텀 템플릿이 없습니다.</p>';
		bindComponentEvents(customList);
		return;
	}

	customList.classList.remove('is-empty-state');
	customList.innerHTML = templates.map(t => `
		<div class="component-item" draggable="true" data-type="${t.id}">
			<div class="component-thumb component-thumb--loading" aria-hidden="true"></div>
			<span class="component-name">${escapeHtml(t.name)}</span>
			<button type="button" class="component-add-btn" aria-label="${escapeHtml(t.name)} 추가">
				<i class="ri-add-line" aria-hidden="true"></i>
			</button>
		</div>`).join('');
	bindComponentEvents(customList);

	for (const t of templates) {
		const item = customList.querySelector(`[data-type="${t.id}"]`);
		if (!item) continue;
		const thumb = item.querySelector('.component-thumb');
		thumb.classList.remove('component-thumb--loading');
		const img = document.createElement('img');
		img.src = getThumbUrl(t.id);
		img.alt = t.id;
		img.className = 'component-thumb-img';
		img.onerror = () => { thumb.innerHTML = '<div class="mix-thumb-placeholder">미리보기 없음</div>'; };
		thumb.appendChild(img);
	}

}


async function generateNewsletterHtml() {
	const newsletterBlocks = state.blocks.filter(b => /^newsletter-\d+__section_/.test(b.type));
	if (!newsletterBlocks.length) return null;

	const fetchCss = async path => {
		try { const r = await fetch(path); return r.ok ? await r.text() : ''; }
		catch (_) { return ''; }
	};

	const nlTemplateBlock = newsletterBlocks.find(b => /^newsletter-\d+__/.test(b.type));
	const nlTemplateName = nlTemplateBlock ? nlTemplateBlock.type.replace(/__section_\d+$/, '') : 'newsletter-01';
	const baseCssPaths = [
		'/00_common/css/basic.css',
		'/00_common/css/theme.css',
		'/00_common/css/con_com.css',
		`/builder/template/templates/design_template/${nlTemplateName}/style.css`
	];
	const bodyBlocks = state.blocks.filter(b => b._isNlBodyBlock);
	const bodyBlockCssPaths = [...new Set(
		bodyBlocks
			.map(bb => componentTemplates[bb.type]?.path)
			.filter(Boolean)
			.map(p => getTemplateCssPath(p))
	)];
	const allCssPaths = [...baseCssPaths, ...bodyBlockCssPaths];
	const cssTexts = await Promise.all(allCssPaths.map(fetchCss));
	const inlinedCss = cssTexts.filter(Boolean).join('\n');

	const sections = newsletterBlocks.map(block => {
		const template = componentTemplates[block.type];
		if (!template) return '';
		const lines = template.markup(block.items[0] || {});
		let sectionHtml = Array.isArray(lines) ? lines.join('\n') : lines;
		if (/^newsletter-\d+__section_1$/.test(block.type)) {
			const tmp = document.createElement('div');
			tmp.innerHTML = sectionHtml;
			const logoImg = tmp.querySelector('img[data-nl-logo]');
			if (logoImg) {
				if (block.nlLogoSrc) {
					logoImg.setAttribute('src', block.nlLogoSrc);
					logoImg.setAttribute('alt', block.nlLogoAlt || '');
					logoImg.style.display = '';
				} else {
					logoImg.remove();
				}
				if (tmp.querySelector('img[data-nl-logo]')) tmp.querySelector('img[data-nl-logo]').removeAttribute('data-nl-logo');
			}
			const deptVal = (block.items[0] || {}).dept || '';
			const phoneVal = (block.items[0] || {}).phone || '';
			const contactRow = tmp.querySelector('.nl-header-info');
			if (contactRow && !deptVal && !phoneVal) contactRow.remove();
			sectionHtml = tmp.innerHTML;
		}
		const _tplExport = componentTemplates[block.type];
		if (_tplExport?.initialBodyBlocks?.length > 0) {
			const tmp = document.createElement('div');
			tmp.innerHTML = sectionHtml;
			const contentArea = tmp.querySelector('[data-edit-field="body"]');
			if (contentArea) {
				contentArea.style.setProperty('--nl-content-fs', (block.nlContentFontSize || 15) + 'px');
				const bodyBlocks = state.blocks.filter(b => b._isNlBodyBlock && b._parentSectionId === block.id);
				if (bodyBlocks.length > 0) {
					contentArea.innerHTML = '';
					bodyBlocks.forEach(bb => {
						const bbTemplate = componentTemplates[bb.type];
						if (!bbTemplate) return;
						let bbHtml;
						if (bbTemplate.isRootWrap) {
							const bbEl = renderAddColumnWrapElement(bbTemplate, bb.items[0] || {}, bb, 0, false);
							stripEditorAttributes(bbEl);
							bbHtml = elementToHtml(bbEl);
						} else {
							const bbEl = buildColumnBlock(bbTemplate, bb, false);
							bbHtml = bbEl instanceof Element ? elementToHtml(bbEl) : String(bbEl);
						}
						const wrapper = document.createElement('div');
						wrapper.className = 'nl-block-insert';
						const gapPx = (bb.marginBottom !== undefined && bb.marginBottom !== null)
							? bb.marginBottom
							: (12);
						wrapper.style.marginBottom = gapPx + 'px';
						if (bb.blockWidth) wrapper.style.width = bb.blockWidth;
						if (bb.blockAlign === 'ac') { wrapper.style.marginLeft = 'auto'; wrapper.style.marginRight = 'auto'; }
						else if (bb.blockAlign === 'ar') { wrapper.style.marginLeft = 'auto'; }
						wrapper.innerHTML = bb.blockIndent ? `<div class="indent">${bbHtml}</div>` : bbHtml;
						contentArea.appendChild(wrapper);
					});
				}
			}
			sectionHtml = tmp.innerHTML;
		}
		return sectionHtml;
	}).join('\n');

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=768">
<title>가정통신문</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
${inlinedCss}
  @page { size: A4 portrait; margin: 20mm 18mm; }
  body {
    font-family: 'Pretendard', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .nl-print-wrapper {
    max-width: 768px;
    margin: 0 auto;
    padding: 0;
  }
  .nl-content-area, [data-edit-field="body"] {
    --box-inr-padding: 0.75rem 1rem;
    --margin-default: 0.5rem;
    --title-size: 1.8rem;
  }
  @media print {
    .nl-content-area, [data-edit-field="body"] {
      --box-inr-padding: 0.75rem 1rem;
      --margin-default: 0.5rem;
      --title-size: 1.8rem;
    }
  }
</style>
</head>
<body>
<div class="nl-print-wrapper">
${sections}
</div>
</body>
</html>`;
}


async function exportNewsletterDoc() {
	const html = await generateNewsletterHtml();
	if (!html) {
		alert('캔버스에 가정통신문 블록이 없습니다.\n먼저 [디자인 커스텀] 탭에서 가정통신문 템플릿을 추가하세요.');
		return;
	}
	const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement('a');
	a.href     = url;
	a.download = '가정통신문.doc';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}



async function exportNewsletterDownload() {
	const html = await generateNewsletterHtml();
	if (!html) {
		alert('캔버스에 가정통신문 블록이 없습니다.\n먼저 [디자인 커스텀] 탭에서 가정통신문 템플릿을 추가하세요.');
		return;
	}
	const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = '가정통신문.html';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}


function switchSidebarTab(tab) {
	state.sidebarTab = tab;
	document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.sidebarTab === tab);
	});
	const panelBlocks = document.getElementById('panelBlocks');
	const panelCustom = document.getElementById('panelCustom');
	if (panelBlocks) panelBlocks.classList.toggle('is-hidden', tab !== 'blocks');
	if (panelCustom) panelCustom.classList.toggle('is-hidden', tab !== 'custom');
	if (tab === 'custom') renderCustomPanel();
}

function bindFilterEvents() {
	KlicBuilderShared.bindFilterEvents({
		container: document,
		onBlockFilter: switchFilterTab,
		onDesignTemplateFilter: switchDesignTemplateFilter
	});
	KlicBuilderShared.bindScrollableFilters();
}

function activateFilterButton(button) {
	if (!button) return;
	if (button.dataset.templateFilter) {
		switchFilterTab(button.dataset.templateFilter);
	}
}

function initFilterScrollUI() {
	document.querySelectorAll('.filter-scroll-shell').forEach(shell => {
		const scroller = shell.querySelector('.component-filters, .deco-filters');
		if (!scroller || scroller.dataset.scrollUiBound === 'true') return;
		scroller.dataset.scrollUiBound = 'true';

		const updateEdges = () => {
			const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
			shell.classList.toggle('is-start', scroller.scrollLeft <= 1);
			shell.classList.toggle('is-end', scroller.scrollLeft >= max - 1);
			shell.classList.toggle('is-scrollable', max > 1);
		};

		let dragging = false;
		let didDrag = false;
		let startX = 0;
		let startLeft = 0;
		let pressButton = null;
		let suppressNextClick = false;

		scroller.addEventListener('pointerdown', event => {
			if (event.button !== 0) return;
			dragging = true;
			didDrag = false;
			startX = event.clientX;
			startLeft = scroller.scrollLeft;
			pressButton = event.target.closest('[data-template-filter], [data-deco-filter]');
			scroller.setPointerCapture?.(event.pointerId);
		});
		scroller.addEventListener('pointermove', event => {
			if (!dragging) return;
			const delta = event.clientX - startX;
			if (!didDrag && Math.abs(delta) < 5) return;
			didDrag = true;
			scroller.classList.add('is-dragging');
			event.preventDefault();
			scroller.scrollLeft = startLeft - (event.clientX - startX);
		});
		const stopDrag = event => {
			if (!dragging) return;
			const clickedButton = !didDrag ? pressButton : null;
			if (!didDrag && pressButton) {
				suppressNextClick = true;
			}
			dragging = false;
			pressButton = null;
			scroller.classList.remove('is-dragging');
			scroller.releasePointerCapture?.(event.pointerId);
			if (clickedButton) activateFilterButton(clickedButton);
		};
		scroller.addEventListener('click', event => {
			if (suppressNextClick) {
				event.preventDefault();
				event.stopPropagation();
				suppressNextClick = false;
				return;
			}
			if (!didDrag) return;
			event.preventDefault();
			event.stopPropagation();
			didDrag = false;
		}, true);
		scroller.addEventListener('dragstart', event => event.preventDefault());
		scroller.addEventListener('pointerup', stopDrag);
		scroller.addEventListener('pointercancel', stopDrag);
		scroller.addEventListener('mouseleave', () => {
			dragging = false;
			didDrag = false;
			pressButton = null;
			scroller.classList.remove('is-dragging');
		});
		scroller.addEventListener('wheel', event => {
			if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
			event.preventDefault();
			scroller.scrollLeft += event.deltaY;
		}, { passive: false });
		scroller.addEventListener('scroll', updateEdges);
		new ResizeObserver(updateEdges).observe(scroller);
		requestAnimationFrame(updateEdges);
	});
}


function applyItemStyles(container, item, template) {
	const so = template?.styleOptions;
	if (!so) return;
	const style = getColumnStyle(item);
	Object.entries(so).forEach(([targetKey, targetConfig]) => {
		if (targetKey === 'title' || targetKey === 'body') return;
		const cssClass = targetConfig.cssClass;
		if (!cssClass) return;
		container.querySelectorAll(cssClass).forEach(el => {
			(targetConfig.fields || []).forEach(f => {
				const val = style[`${targetKey}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`];
				if (val == null) return;
				if (f.key === 'backgroundColor') el.style.backgroundColor = val;
				else if (f.key === 'textColor') el.style.color = val;
				else if (f.key === 'borderColor') el.style.borderColor = val;
			});
			const fw = style[`${targetKey}FontWeight`];
			const fs = style[`${targetKey}FontSize`];
			if (fw) el.style.fontWeight = fw;
			if (fs) el.style.fontSize = `${fs}px`;
		});
	});
}

function applyAllTemplateStyles() {
	state.blocks.forEach(block => {
		const template = componentTemplates[block.type];
		const blockEl = document.querySelector(`.builder-block[data-block-id="${block.id}"]`);
		if (!blockEl) return;
		const outerItems = Array.from(blockEl.querySelectorAll('.block-item')).filter(el => {
			const bid = el.dataset.blockId || '';
			return !bid.match(/::list::\d+$/) && !bid.includes('::tcell::');
		});
		block.items.forEach((item, idx) => {
			if (outerItems[idx]) applyItemStyles(outerItems[idx], item, template);
		});
		if (block.useList) {
			const listWraps = Array.from(blockEl.querySelectorAll('.list-wrap'));
			listWraps.forEach((listWrap, wrapIdx) => {
				const rowItem = block.items[wrapIdx];
				if (!rowItem || !rowItem.listBlock) return;
				const listTemplate = componentTemplates[rowItem.listBlock.type];
				if (!listTemplate) return;
				const innerItems = listWrap.querySelectorAll('.block-item');
				rowItem.listBlock.items.forEach((lb_item, idx) => {
					if (innerItems[idx]) applyItemStyles(innerItems[idx], lb_item, listTemplate);
				});
			});
		}
		if (block.tableCellInnerBlocks) {
			Object.entries(block.tableCellInnerBlocks).forEach(([cellKey, ib]) => {
				const innerTemplate = componentTemplates[ib.type];
				if (!innerTemplate) return;
				const selector = `.block-item[data-block-id="${CSS.escape(`${block.id}::tcell::${cellKey}`)}"]`;
				const innerItems = blockEl.querySelectorAll(selector);
				ib.items?.forEach((item, idx) => {
					if (innerItems[idx]) applyItemStyles(innerItems[idx], item, innerTemplate);
				});
			});
		}
	});
}

function syncCanvasPresence() {
	const canvasBlockCount = state.blocks.filter(b => !b._isNlBodyBlock && !b._slotParentId).length;
	const hasBlocks = canvasBlockCount > 0;
	const hasOverlays = state.overlays.length > 0;
	layoutStatus.textContent = hasOverlays
		? `${canvasBlockCount}개 블록 · ${state.overlays.length}개 꾸밈요소`
		: `${canvasBlockCount}개 블록`;
	const builderMain = document.getElementById('builderMain');
	builderMain.classList.toggle('has-blocks', hasBlocks);
	builderMain.classList.toggle('has-overlays', hasOverlays);
	return { hasBlocks, hasOverlays };
}

function syncCanvasGuideSize() {
	const guide = document.querySelector('.canvas-guide');
	if (!guide || !canvasGrid) return;
	const gridHeight = canvasGrid.scrollHeight || canvasGrid.offsetHeight || 0;
	const wrapper = document.getElementById('canvasWrapper');
	const wrapperHeight = wrapper?.clientHeight || 0;
	guide.style.height = `${Math.max(gridHeight, wrapperHeight)}px`;
}

function syncTocFromTitles() {
	const tocBlock = state.blocks.find(b => b.isTocTable === true);
	if (!tocBlock) return;

	const item = tocBlock.items[0];
	if (!item) return;

	const colCount = tocBlock.tableColCount || 1;
	if (Array.isArray(tocBlock.tableTbodyRows)) {
		tocBlock.tableTbodyRows.forEach(row => {
			for (let c = 0; c < colCount; c++) delete item[`${row.key}_c${c}`];
		});
	}

	const parentId = tocBlock._parentSectionId;
	const titleBlocks = state.blocks.filter(b =>
		b.type === 'title-02' &&
		b._isNlBodyBlock === true &&
		b._parentSectionId === parentId
	);

	tocBlock.tableTbodyRows = [];

	if (titleBlocks.length === 0) {
		const emptyKey = `toc_empty_${tocBlock.id}`;
		tocBlock.tableTbodyRows.push({ key: emptyKey, thAlign: '', tdAlign: '', cellTags: ['td'] });
		item[`${emptyKey}_c0`] = '';
		return;
	}

	titleBlocks.forEach((titleBlock, index) => {
		const num = index + 1;

		titleBlock.anchorId = `list_n${num}`;

		const titleItem = titleBlock.items[0];
		if (titleItem) {
			const body = (titleItem.title || '').replace(/^\d+\.\s*/, '');
			titleItem.title = `${num}. ${body}`;
		}

		const titleText = (titleBlock.items[0] || {}).title || '';
		const icons = Array.isArray(titleBlock.privacyIcons) ? titleBlock.privacyIcons : [];
		const rowKey = `toc_${titleBlock.id}`;

		tocBlock.tableTbodyRows.push({
			key: rowKey,
			thAlign: '',
			tdAlign: 'al',
			cellTags: ['td'],
			privacyIcons: icons.slice()
		});
		item[`${rowKey}_c0`] = `<a href="#${escapeAttr(titleBlock.anchorId)}">${titleText}</a>`;
	});
}

function render() {
	// 역대교장 tyA(목록형) 팝업이 이전 렌더에서 document.body로 옮겨져
	// 열려 있었다면, 캔버스를 새로 그리기 전에 그 옛 DOM 노드부터 정리한다.
	// (열림 "의도"는 _principalTyAOpenPopupBlockId 플래그로 별도 보존되어
	// 있어서, 렌더가 끝나면 최신 내용의 새 팝업 노드로 자동 재오픈된다.)
	discardStalePrincipalTyAPopupNode();
	syncTocFromTitles();
	syncActiveTemplateStyles();
	state.blocks.forEach(block => {
		if (templateCategories[block.type] === 'list') ensureListRows(block);
		if (Array.isArray(block.innerBlocks)) {
			block.innerBlocks.forEach((ib, idx) => {
				if (templateCategories[ib.type] === 'list') {
					ensureListRows({ id: `${block.id}::inner::${idx}`, type: ib.type, items: ib.items });
				}
			});
		}
		// Initialize inner list rows in each process step.
		if (templateCategories[block.type] === 'process') {
			block.items.forEach((item, stepIdx) => {
				(item.innerBlocks || []).forEach((ib, ibIdx) => {
					if (templateCategories[ib.type] === 'list') {
						ensureListRows({ id: `${block.id}::pstep::${stepIdx}::inner::${ibIdx}`, type: ib.type, items: ib.items });
					}
				});
			});
		}
		// Initialize list rows in table cell inner blocks.
		if (block.tableCellInnerBlocks) {
			Object.entries(block.tableCellInnerBlocks).forEach(([cellKey, ib]) => {
				if (templateCategories[ib.type] === 'list') {
					ensureListRows({ id: `${block.id}::tcell::${cellKey}`, type: ib.type, items: ib.items });
				}
			});
		}
	});
	const { hasBlocks, hasOverlays } = syncCanvasPresence();
	canvasGrid.className = hasBlocks ? 'canvas-grid' : 'canvas-grid is-empty';
	const canvasVisibleBlocks = state.blocks.filter(b => !b._isNlBodyBlock && !b._slotParentId);
	canvasGrid.innerHTML = hasBlocks
		? canvasVisibleBlocks.map((block, idx) => renderBuilderBlock(block, idx, canvasVisibleBlocks.length)).join('')
		: hasOverlays
			? ''
		: '<div class="canvas-empty">왼쪽 디자인 블록을 여기로 드래그하세요</div>';
	bindRenderedEvents();
	addPrincipalCanvasControls();
	addGreetingCanvasControls();
	addSymbolCanvasControls();
	initHistoryCanvasSliders();
	addHistoryCanvasControls();
	focusHistoryAddedYear();
	initPrincipalCanvasSliders();
	focusPrincipalAddedItem();
	applyAllTemplateStyles();
	syncCanvasGuideSize();
	updateMarkup();
	if (state.selectedItem) {
		const { blockId, columnIndex } = state.selectedItem;
		const block = state.blocks.find(b => b.id === blockId);
		if (block && (columnIndex === null || block.items[columnIndex])) {
			if (columnIndex !== null) {
				const el = document.querySelector(`.block-item[data-block-id="${blockId}"][data-column-index="${columnIndex}"]`);
				if (el) el.classList.add('is-selected');
			} else {
				const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
				if (blockEl) blockEl.classList.add('is-selected');
			}
		} else {
			state.selectedItem = null;
		}
	}
	if (_propsBlockId) {
		const block = resolveEditableBlockData(_propsBlockId);
		const mixRef = !block ? resolveMixInnerRef(_propsBlockId) : null;
		const resolvedBlock = block || (mixRef
			? { id: _propsBlockId, type: mixRef.innerBlock.type, items: mixRef.innerBlock.items, blockWidth: null, marginBottom: mixRef.innerBlock.marginBottom ?? 10, blockAlign: '' }
			: null);
		if (resolvedBlock) {
			const widthSel = document.getElementById('propBlockWidth');
			const marginInput = document.getElementById('propMarginBottom');
			const marginTopInput = document.getElementById('propMarginTop');
			const marginLeftInput = document.getElementById('propMarginLeft');
			const marginRightInput = document.getElementById('propMarginRight');
			const indentInput = document.getElementById('propBlockIndent');
			if (widthSel) widthSel.value = resolvedBlock.blockWidth || '';
			if (marginInput) marginInput.value = resolvedBlock.marginBottom ?? 30;
			if (marginTopInput) marginTopInput.value = resolvedBlock.marginTop ?? 0;
			if (marginLeftInput) marginLeftInput.value = resolvedBlock.marginLeft ?? 0;
			if (marginRightInput) marginRightInput.value = resolvedBlock.marginRight ?? 0;
			if (indentInput) indentInput.checked = !!resolvedBlock.blockIndent;
			document.querySelectorAll('#propBlockAlign .props-align-btn').forEach(btn => {
				btn.classList.toggle('is-active', btn.dataset.align === (resolvedBlock.blockAlign || ''));
			});
			const icoSelect = document.getElementById('propBoxIco');
			if (icoSelect && resolvedBlock.type === 'box-05') icoSelect.value = resolvedBlock.icoId || 'ico-box1';
			if (templateCategories[resolvedBlock.type] === 'symbol') syncSymbolBoxCheckboxes(_propsBlockId);
			if (resolvedBlock.type === 'title-02') {
				const selectedIcons = Array.isArray(resolvedBlock.privacyIcons) ? resolvedBlock.privacyIcons : [];
				document.querySelectorAll('#propsPrivacyIconGrid .props-privacy-icon-btn').forEach(btn => {
					btn.classList.toggle('is-active', selectedIcons.includes(btn.dataset.iconSrc));
				});
			}
			if (resolvedBlock.type === 'table-01' && _currentPrivacyTableRowKey?.blockId === resolvedBlock.id) {
				_updatePrivacyTableIconGrid(resolvedBlock);
			}
			if (resolvedBlock.type === 'button-00') {
				renderPropsButtonInnerItems(resolvedBlock);
			}
			if (templateCategories[resolvedBlock.type] === 'button' && resolvedBlock.type !== 'button-00') {
				const btnSizeSel = document.getElementById('propBtnSize');
				if (btnSizeSel) btnSizeSel.value = resolvedBlock.btnSize || '';
				const btnOpenTypeSel = document.getElementById('propBtnOpenType');
				if (btnOpenTypeSel) btnOpenTypeSel.value = resolvedBlock.btnOpenType || 'default';
				const btnIconSel = document.getElementById('propBtnIcon');
				if (btnIconSel) {
					btnIconSel.value = resolvedBlock.btnIcon || 'ri-external-link-line';
					btnIconSel.disabled = resolvedBlock.btnOpenType === 'new-window';
				}
				const btnIconPosSel = document.getElementById('propBtnIconPos');
				if (btnIconPosSel && resolvedBlock.type === 'button-05') btnIconPosSel.value = resolvedBlock.btnIconPos || 'before';
			}
			const processColsSelect = document.getElementById('propProcessCols');
			if (processColsSelect && resolvedBlock.type === 'process-01') {
				processColsSelect.value = String(resolvedBlock.items.length);
			}
			if (templateCategories[resolvedBlock.type] === 'process') {
				const stepsContainer = document.getElementById('propsProcessStepsContainer');
				if (stepsContainer) {
					stepsContainer.querySelectorAll('.props-process-sub-input').forEach(input => {
						if (document.activeElement === input) return;
						const stepIdx = Number(input.dataset.stepIdx);
						const item = resolvedBlock.items[stepIdx];
						if (item) input.value = (item.sub || '').replace(/<[^>]+>/g, '');
					});
				}
			}
			const inlineLinkSectionEl = document.getElementById('propsInlineLinkSection');
			if (inlineLinkSectionEl && inlineLinkSectionEl.style.display !== 'none') {
				const inlineLinks = extractBlockInlineLinks(resolvedBlock);
				if (inlineLinks.length > 0) renderPropsInlineLinks(inlineLinks);
			}
		} else {
			closeBlockProps();
		}
	}
	initCanvasReactTab();
	initCanvasAccordion();
}

function initCanvasAccordion() {
	if (typeof AccordionStyle === 'function') AccordionStyle();
}

function initCanvasReactTab() {
	if (typeof $ === 'undefined') return;
	var isReact = state.previewDevice === 'tablet' || state.previewDevice === 'mobile';

	$(canvasGrid).find('.tab-st[class*="depth"]:not(".not-js")').each(function () {
		var $tab = $(this);

		// reactTab ?대옒???곸슜/?쒓굅
		if (isReact) {
			$tab.addClass('reactTab');
		} else {
			$tab.removeClass('reactTab').find('> ul').removeAttr('style');
		}

		$tab.find('> a.select').remove();
		if (!isReact) return;

		var $onLi = $tab.find('> ul > li.on');
		if (!$onLi.length) return;
		var $linkCopy = $onLi.find('> a').clone().attr('class', 'select');
		$onLi.attr('title', $onLi.text().trim() + ' ?좏깮???섏씠吏');
		$tab.find('> ul').before($linkCopy);

		$linkCopy.on('click', function (e) {
			e.preventDefault();
			e.stopPropagation(); // block-item ?좏깮 ?대깽??李⑤떒
			var $tabBox = $tab.find('> ul');
			$tabBox.slideToggle(200);
			$(this).toggleClass('on');
		});
	});
}

function _calcEffectiveWidth(blockWidth, marginLeft, marginRight) {
	if (!blockWidth) return null;
	const ml = marginLeft || 0;
	const mr = marginRight || 0;
	if (blockWidth.endsWith('%') && (ml || mr)) {
		const deductions = [ml && `${ml}px`, mr && `${mr}px`].filter(Boolean).join(' - ');
		return `calc(${blockWidth} - ${deductions})`;
	}
	return blockWidth;
}

function renderBuilderBlock(block, idx = 0, total = 1) {
	const template = componentTemplates[block.type];
	if (!template) return '';
	const effectiveMarginBottom = (total <= 1 || idx === total - 1) ? 0 : (block.marginBottom ?? 10);
	const blockStyleParts = [`margin-bottom:${effectiveMarginBottom}px`];
	if (block.marginTop) blockStyleParts.push(`margin-top:${block.marginTop}px`);
	if (block.blockAlign === 'ac') {
		blockStyleParts.push('margin-left:auto', 'margin-right:auto');
	} else if (block.blockAlign === 'ar') {
		blockStyleParts.push('margin-left:auto');
		if (block.marginRight) blockStyleParts.push(`margin-right:${block.marginRight}px`);
	} else {
		if (block.marginLeft) blockStyleParts.push(`margin-left:${block.marginLeft}px`);
		if (block.marginRight) blockStyleParts.push(`margin-right:${block.marginRight}px`);
	}
	const effectiveWidth = _calcEffectiveWidth(block.blockWidth, block.blockAlign ? 0 : block.marginLeft, block.blockAlign ? 0 : block.marginRight);
	if (effectiveWidth) blockStyleParts.push(`width:${effectiveWidth}`);
	const dragHandle = `<span class="block-drag-handle" data-tooltip="이동" aria-label="블록 이동"><i class="ri-draggable" aria-hidden="true"></i></span>`;
	const blockBodyHtml = `
			<div class="${template.addDirection === 'row' ? `builder-columns columns-${block.columns}` : `builder-rows rows-${block.columns}`}">
				${renderRepeatedColumns(block)}
			</div>`;
	const blockContentHtml = block.blockIndent ? `<div class="indent">${blockBodyHtml}</div>` : blockBodyHtml;
	return `
		<section class="builder-block" draggable="true" data-block-id="${block.id}" style="${blockStyleParts.join(';')}">
			<div class="block-controls" aria-hidden="true">
				${dragHandle}
				<button type="button" class="block-duplicate" data-tooltip="복사" data-duplicate-block-id="${block.id}" aria-label="블록 복사">
					<i class="ri-file-copy-line" aria-hidden="true"></i>
				</button>
				<button type="button" class="block-remove" data-tooltip="삭제" data-remove-block-id="${block.id}" aria-label="블록 삭제">
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>
			</div>
			${blockContentHtml}
		</section>
	`;
}

let _principalFocusRequest = null;
let _historyFocusRequest = null;
// 역대교장 tyA(목록형) "약력보기" 팝업이 열려 있는 블록의 id / 그 안에서
// 편집 중인 항목의 suffix(예: order3 → "3"). 둘 다 null이면 닫혀 있는 상태.
// 팝업 자체는 render() 때마다 새로 만들어지므로(DOM 노드가 아니라) 이
// 값들만 렌더를 넘나들며 "열림" 의도를 기억한다.
// 자세한 배경은 bindPrincipalTyAListPopup() 위 주석 참고.
let _principalTyAOpenPopupBlockId = null;
let _principalTyAOpenPopupSuffix = null;

function getPrincipalItemNodes(root) {
	if (!root) return [];
	if (root.classList?.contains('tyA') && root.classList.contains('slide')) {
		return Array.from(root.querySelectorAll(':scope .priHisSwiper .swiper-wrapper > .swiper-slide'));
	}
	if (root.classList?.contains('tyA') && root.classList.contains('list')) {
		return Array.from(root.querySelectorAll(':scope > .list-wrap > ul > li'));
	}
	if (root.classList?.contains('tyB')) {
		return Array.from(root.querySelectorAll(':scope > .list-wrap > ul > li')).filter(li => !li.classList.contains('detail-row'));
	}
	if (root.classList?.contains('tyC')) {
		return Array.from(root.querySelectorAll(':scope > .list-wrap > ul > li'));
	}
	return [];
}

function getPrincipalDefaultCount(type) {
	const template = componentTemplates[type];
	return getPrincipalItemNodes(template?.element).length || 1;
}

// 항목이 개별적으로 몇 번째 필드 묶음(photo{n}/order{n}/name{n}/term{n}...)에
// 해당하는지 알아낸다. tyA(목록형)처럼 기본 8개 항목이 1,3,5,7... 처럼
// 건너뛰는 번호를 쓰는 템플릿도 있고, tyB/tyC처럼 1,2,3... 순번을 쓰는
// 템플릿도 있어서, "배열 인덱스+1"이 아니라 항목 자신의 실제 data-edit-field
// 숫자를 읽어야 정확하다.
// 템플릿마다 공통으로 갖는 필드가 달라(tyA/tyB/tyC-img는 photo, 이미지가 없는
// tyC는 order, tyB는 label) 우선순위를 두고 순서대로 찾는다 — 같은 항목 안의
// photo/order/name/term 등은 항상 같은 번호를 쓰므로(생성 시 각 접두사의
// 카운터가 같은 값에서 시작해 함께 증가) 어느 것을 찾아도 결과는 같다.
function getPrincipalItemFieldSuffix(itemEl) {
	for (const prefix of ['photo', 'order', 'label']) {
		const field = itemEl?.querySelector(`[data-edit-field^="${prefix}"]`);
		const match = field?.dataset.editField?.match(/\d+$/)?.[0];
		if (match) return match;
	}
	return null;
}

function getFieldPrefix(fieldName) {
	return String(fieldName || '').replace(/\d+$/, '') || 'field';
}

function getPrincipalFieldCounters(root) {
	const counters = {};
	root.querySelectorAll('[data-edit-field]').forEach(field => {
		const name = field.dataset.editField;
		const prefix = getFieldPrefix(name);
		const num = Number(String(name).match(/\d+$/)?.[0] || 0);
		counters[prefix] = Math.max(counters[prefix] || 0, num);
	});
	return counters;
}

function getPrincipalOrderHtml(index) {
	return `제 <strong>${String(index).padStart(2, '0')}</strong> 대`;
}

function syncPrincipalOrderNumbers(root, item) {
	getPrincipalItemNodes(root).forEach((itemEl, idx) => {
		itemEl.querySelectorAll('[data-edit-field^="order"]').forEach(field => {
			const fieldName = field.dataset.editField;
			// "몇 대 교장"을 직접 수정(팝업 저장/리스트에서 더블클릭 수정)해 둔
			// 항목은 위치 기준 자동 번호매김 대상에서 제외한다. 그렇지 않으면
			// 교장을 추가/삭제할 때마다 실행되는 이 자동 번호매김이 사용자가
			// 일부러 넣은 "제 20대" 같은 값을 리스트상 위치(예: 4번째 → 04)로
			// 매번 덮어써 버린다.
			if (item?.[`orderManual${String(fieldName).replace(/^order/, '')}`]) return;
			const html = getPrincipalOrderHtml(idx + 1);
			field.innerHTML = html;
			if (item && fieldName) item[fieldName] = html;
		});
	});
}

function applyPrincipalItemCount(root, block, item) {
	const nodes = getPrincipalItemNodes(root);
	if (!nodes.length) return;
	const targetCount = Math.max(nodes.length, block.principalItemCount || nodes.length);
	const parent = nodes[0].parentElement;
	const templateNode = nodes[nodes.length - 1];
	const counters = getPrincipalFieldCounters(root);
	for (let i = nodes.length; i < targetCount; i++) {
		const clone = templateNode.cloneNode(true);
		clone.querySelectorAll('[data-edit-field]').forEach(field => {
			const prefix = getFieldPrefix(field.dataset.editField);
			const nextName = `${prefix}${++counters[prefix]}`;
			field.dataset.editField = nextName;
			if (prefix === 'order') field.innerHTML = getPrincipalOrderHtml(i + 1);
			if (item[nextName] == null) item[nextName] = field.innerHTML;
		});
		parent.appendChild(clone);
	}
	// 개별적으로 삭제된 항목(요청사항: 기본으로 깔려있던 항목도 삭제 가능해야
	// 함)은 매 렌더마다 DOM에서 완전히 제거한다. 개수 채우기(위 for문)가 끝난
	// 뒤, 번호 재계산(아래 syncPrincipalOrderNumbers) 전에 제거해야 남은
	// 항목들이 삭제된 자리만큼 순번을 당겨 받는다.
	if (block?.principalRemovedSuffixes?.length) {
		getPrincipalItemNodes(root).forEach(itemEl => {
			const suffix = getPrincipalItemFieldSuffix(itemEl);
			if (suffix && block.principalRemovedSuffixes.includes(suffix)) itemEl.remove();
		});
	}
	syncPrincipalOrderNumbers(root, item);
}

function addPrincipalItem(blockId) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'principal') return;
	pushHistory();
	const nextCount = Math.max(block.principalItemCount || getPrincipalDefaultCount(block.type), 1) + 1;
	block.principalItemCount = nextCount;
	_principalFocusRequest = { blockId, itemIndex: nextCount - 1 };
	render();
	openBlockProps(block.id);
}

// itemEl: 삭제 버튼이 눌린 그 <li>/슬라이드 DOM 노드. 배열 인덱스가 아니라
// 이 노드 자신의 photo{n} 번호(suffix)로 식별한다 — tyA(목록형)의 기본
// 8개 항목은 1,3,5,7...처럼 건너뛰는 번호를 쓰기 때문에, "인덱스+1"을
// suffix로 착각하면(과거 버그) 엉뚱한 다른 항목의 데이터가 지워진다.
function removePrincipalItem(blockId, itemEl) {
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'principal') return;
	const escapedBlockId = window.CSS?.escape ? CSS.escape(blockId) : String(blockId).replace(/"/g, '\\"');
	const principalEl = document.querySelector(`.builder-block[data-block-id="${escapedBlockId}"] .pri-his`);
	const nodes = getPrincipalItemNodes(principalEl);
	// 최소 1개는 항상 남아 있어야 한다.
	if (nodes.length <= 1) return;
	const suffix = getPrincipalItemFieldSuffix(itemEl);
	if (!suffix) return;
	pushHistory();
	const item = block.items?.[0] || {};
	// key가 "접두사+숫자" 형태일 때 그 숫자가 정확히 이 항목의 suffix와
	// 일치하는 것만 지운다(예전처럼 문자열 끝이 우연히 같은 다른 항목의
	// key까지 같이 지우는 일이 없도록).
	Object.keys(item).forEach(key => {
		const m = key.match(/^([a-zA-Z]+)(\d+)$/);
		if (m && m[2] === suffix) delete item[key];
	});
	// tyB/tyC의 기존 모달 편집 데이터(배열 위치 기준 키)도 함께 정리한다.
	const itemIndex = nodes.indexOf(itemEl);
	if (itemIndex >= 0) delete item[getPrincipalBioHtmlKey(itemIndex)];
	block.principalRemovedSuffixes = block.principalRemovedSuffixes || [];
	if (!block.principalRemovedSuffixes.includes(suffix)) block.principalRemovedSuffixes.push(suffix);
	render();
	openBlockProps(block.id);
}

function getPrincipalBioSource(itemEl) {
	return itemEl?.querySelector(':scope > .popup-data, :scope > .detail-data');
}

function isPrincipalDetailBio(itemEl) {
	return !!itemEl?.querySelector(':scope > .detail-data');
}

function getPrincipalBioPopup(itemEl) {
	const source = getPrincipalBioSource(itemEl);
	if (!source) return null;
	if (source.classList.contains('detail-data')) return source;
	return source.querySelector('.pri-his.popup, details .pri-his.popup') || itemEl?.querySelector('.pri-his.popup');
}

function getPrincipalBioHtmlKey(itemIndex) {
	return `principalBioHtml${itemIndex + 1}`;
}

// itemSuffixes: 내보내기(마크업 보기/배포) 렌더링 경로에서는 이 함수가
// 호출되기 전에 이미 각 항목의 data-edit-field 속성이 제거된다(아래
// renderAddColumnWrapElement/buildColumnBlock 참고). 그래서 이 함수 자신이
// DOM에서 항목 번호(suffix)를 다시 읽으려 하면 항상 실패한다 — 호출부가
// data-edit-field가 아직 남아있는 시점에 getPrincipalItemFieldSuffix()로
// 미리 뽑아서 배열로 넘겨준다. 넘겨받지 못했을 때(예: 다른 호출 경로)는
// 안전하게 그 자리에서 다시 계산을 시도한다.
function applyPrincipalBioOverrides(root, item, itemSuffixes) {
	getPrincipalItemNodes(root).forEach((itemEl, idx) => {
		preparePrincipalBioSource(itemEl);
		const popup = getPrincipalBioPopup(itemEl);
		const html = item?.[getPrincipalBioHtmlKey(idx)];
		if (popup && html) popup.innerHTML = html;
	});
	applyPrincipalAchieveOverrides(root, item);
	// tyA(목록형) 팝업은 항목마다 다른 내용(학력/주요업적)을 보여줘야 하므로
	// 여기서 통째로 덮어쓰지 않는다. 캔버스에서는 "약력보기" 클릭 시점에
	// openPrincipalTyAPopup()이 클릭된 항목의 저장값(principalAchieve{suffix})을
	// 읽어 그때그때 채워 넣는다. (아래 bindPrincipalTyAListPopup 관련 주석 참고)
	// 배포 페이지에서도 항목별 내용이 나오게 하려면 그 데이터가 내보내기
	// 결과물(정적 HTML)에도 담겨 있어야 하므로, 아래 함수가 각 <li> 안에
	// 눈에 보이지 않는 <template>으로 심어 둔다.
	applyPrincipalTyAListItemAchieveData(root, item, itemSuffixes);
}

// 항목별 학력/주요업적(principalAchieve{suffix})을 배포 페이지(sub_com.js)에서도
// 쓸 수 있도록, 커스터마이즈된 항목의 <li> 안에 <template class="pri-his-achieve-data">
// 로 심어 둔다. <template> 태그는 브라우저가 절대 렌더링/표시하지 않으므로
// 화면에는 아무 영향이 없고, sub_com.js가 "약력보기" 클릭 시 이 내용을 읽어
// 공용 팝업의 학력/주요업적 영역에 채워 넣는다. 커스터마이즈하지 않은 항목은
// <template>을 만들지 않고, 팝업에 원래부터 있는 기본 내용을 그대로 쓴다.
function applyPrincipalTyAListItemAchieveData(root, item, itemSuffixes) {
	if (!getPrincipalTyAListPopup(root)) return;
	getPrincipalItemNodes(root).forEach((itemEl, idx) => {
		const suffix = itemSuffixes?.[idx] ?? getPrincipalItemFieldSuffix(itemEl);
		const html = suffix ? item?.[`principalAchieve${suffix}`] : null;
		const usable = isPrincipalTyAAchieveHtmlUsable(html) ? html : null;
		let tpl = itemEl.querySelector(':scope > template.pri-his-achieve-data');
		if (!usable) { tpl?.remove(); return; }
		if (!tpl) {
			tpl = document.createElement('template');
			tpl.className = 'pri-his-achieve-data';
			itemEl.appendChild(tpl);
		}
		tpl.innerHTML = usable;
	});
}

function getPrincipalTyAListPopup(root) {
	if (!root?.classList?.contains('tyA') || !root.classList.contains('list')) return null;
	return root.querySelector(':scope > .pri-his.popup');
}

function preparePrincipalBioSource(itemEl) {
	const source = getPrincipalBioSource(itemEl);
	if (!source) return;
	if (source.classList.contains('detail-data')) return;
	source.setAttribute('aria-hidden', 'true');
	source.querySelectorAll('details').forEach(details => {
		const popup = details.querySelector('.pri-his.popup');
		if (popup) source.appendChild(popup);
		details.remove();
	});
}

function saveAchieveValue(ddEl, blockId) {
	const fieldName = ddEl && ddEl.dataset.editField;
	if (!fieldName) return;
	const targetItems = getEditTargetItems(blockId);
	if (!targetItems || !targetItems[0]) return;
	const clean = ddEl.cloneNode(true);
	clean.querySelectorAll('.achieve-row-actions').forEach(function(el) { el.remove(); });
	clean.querySelectorAll('[contenteditable]').forEach(function(el) { el.removeAttribute('contenteditable'); });
	targetItems[0][fieldName] = clean.innerHTML;
	updateMarkup();
}

function cleanAchieveBlockHtml(blockEl) {
	const clean = blockEl.cloneNode(true);
	clean.querySelectorAll('.achieve-row-actions, .achieve-block-actions').forEach(function(el) { el.remove(); });
	clean.querySelectorAll('[contenteditable]').forEach(function(el) { el.removeAttribute('contenteditable'); });
	return clean.outerHTML;
}

function saveAchieveWrapValue(hisWrap, blockId) {
	const blockKey = hisWrap?.dataset.achieveBlocksField;
	if (!blockKey) return;
	const targetItems = getEditTargetItems(blockId);
	if (!targetItems || !targetItems[0]) return;
	targetItems[0][blockKey] = Array.from(hisWrap.querySelectorAll(':scope > .achieve-block')).map(cleanAchieveBlockHtml).join('');
	updateMarkup();
}

function applyPrincipalAchieveOverrides(root, item) {
	root.querySelectorAll('.his-wrap').forEach(function(hisWrap, idx) {
		const key = `achieveBlocks${idx + 1}`;
		if (item?.[key]) hisWrap.innerHTML = item[key];
	});
}

function decoratePrincipalAchieveBlockActions(hisWrap, blockId) {
	if (!hisWrap || hisWrap.dataset.achieveBlocksReady === 'true') return;
	const firstTitle = hisWrap.querySelector(':scope > .achieve-block dt[data-edit-field]');
	const suffix = String(firstTitle?.dataset.editField || '').match(/\d+$/)?.[0] || '';
	if (!suffix) return;
	hisWrap.dataset.achieveBlocksReady = 'true';
	hisWrap.dataset.achieveBlocksField = `achieveBlocks${suffix}`;
	hisWrap.addEventListener('click', function(event) {
		const addBlockBtn = event.target.closest('.achieve-block-add');
		const removeBlockBtn = event.target.closest('.achieve-block-remove');
		if (!addBlockBtn && !removeBlockBtn) return;
		event.preventDefault();
		event.stopPropagation();
		const currentBlock = event.target.closest('.achieve-block');
		if (!currentBlock || !hisWrap.contains(currentBlock)) return;
		pushHistory();
		if (addBlockBtn) {
			const clone = currentBlock.cloneNode(true);
			clone.querySelectorAll('.achieve-row-actions, .achieve-block-actions').forEach(function(el) { el.remove(); });
			const title = clone.querySelector(':scope > dt');
			const list = clone.querySelector(':scope > dd');
			if (title) title.textContent = '주요업적';
			if (list) list.innerHTML = '<p class="bu-st3">내용을 입력하세요.</p>';
			currentBlock.insertAdjacentElement('afterend', clone);
			decoratePrincipalAchieveRows(hisWrap.closest('.pri-his') || hisWrap, blockId);
			saveAchieveWrapValue(hisWrap, blockId);
			clone.querySelector(':scope > dt')?.focus();
			return;
		}
		if (hisWrap.querySelectorAll(':scope > .achieve-block').length > 1) {
			const focusTarget = currentBlock.nextElementSibling || currentBlock.previousElementSibling;
			currentBlock.remove();
			saveAchieveWrapValue(hisWrap, blockId);
			focusTarget?.querySelector(':scope > dt')?.focus();
		}
	});
}

function decoratePrincipalAchieveRows(root, blockId) {
	root.querySelectorAll('.his-wrap').forEach(function(hisWrap) {
		decoratePrincipalAchieveBlockActions(hisWrap, blockId);
	});
	root.querySelectorAll('.his-wrap .achieve-block').forEach(function(dlEl) {
		if (!dlEl.querySelector(':scope > .achieve-block-actions')) {
			var blockActions = document.createElement('span');
			blockActions.className = 'achieve-block-actions';
			blockActions.innerHTML = '<button type="button" class="achieve-row-btn achieve-block-add" title="업적 섹션 추가" aria-label="업적 섹션 추가"><i class="ri-add-line" aria-hidden="true"></i></button><button type="button" class="achieve-row-btn achieve-block-remove" title="업적 섹션 삭제" aria-label="업적 섹션 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
			dlEl.appendChild(blockActions);
		}
		dlEl.querySelector(':scope > dt')?.setAttribute('contenteditable', 'true');
	});
	// .achieve-list: 기존 유형(dt/dd가 .achieve-block으로 묶인 형태)의 내용 리스트 클래스명
	// .his-sec: principal-tyC-img처럼 dt/dd가 평평하게 나열된 유형에서 쓰는 클래스명
	// — 구조(다수의 <p class="bu-st3">)가 동일해 같은 추가/삭제 로직을 그대로 재사용한다.
	root.querySelectorAll('.his-wrap .achieve-list[data-edit-field], .his-wrap .his-sec[data-edit-field]').forEach(function(ddEl) {
		ddEl.querySelectorAll(':scope > p').forEach(function(p) {
			p.setAttribute('contenteditable', 'true');
			if (!p.querySelector('.achieve-row-actions')) {
				var actions = document.createElement('span');
				actions.className = 'achieve-row-actions';
				actions.setAttribute('contenteditable', 'false');
				actions.innerHTML = '<button type="button" class="achieve-row-btn achieve-row-add" title="항목 추가" aria-label="항목 추가"><i class="ri-add-line" aria-hidden="true"></i></button><button type="button" class="achieve-row-btn achieve-row-remove" title="항목 삭제" aria-label="항목 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
				p.appendChild(actions);
			}
		});
		if (ddEl.dataset.achieveEditorBound === 'true') return;
		ddEl.dataset.achieveEditorBound = 'true';
		ddEl.addEventListener('click', function(event) {
			var addBtn = event.target.closest('.achieve-row-add');
			var removeBtn = event.target.closest('.achieve-row-remove');
			if (!addBtn && !removeBtn) return;
			event.preventDefault();
			event.stopPropagation();
			var p = event.target.closest('p');
			if (!p || !ddEl.contains(p)) return;
			pushHistory();
			if (addBtn) {
				var newP = document.createElement('p');
				newP.className = 'bu-st3';
				newP.textContent = '내용을 입력하세요.';
				p.insertAdjacentElement('afterend', newP);
				decoratePrincipalAchieveRows(root, blockId);
				saveAchieveValue(ddEl, blockId);
				newP.focus();
				return;
			}
			var items = Array.from(ddEl.querySelectorAll(':scope > p'));
			if (items.length > 1) {
				var focusTarget = p.nextElementSibling || p.previousElementSibling;
				p.remove();
				decoratePrincipalAchieveRows(root, blockId);
				saveAchieveValue(ddEl, blockId);
				if (focusTarget) focusTarget.focus();
			}
		});
		ddEl.addEventListener('input', function(event) {
			if (event.target.closest('.achieve-row-actions')) return;
			saveAchieveValue(ddEl, blockId);
			saveAchieveWrapValue(ddEl.closest('.his-wrap'), blockId);
		});
	});
	root.querySelectorAll('.his-wrap .achieve-block > dt').forEach(function(dtEl) {
		if (dtEl.dataset.achieveTitleBound === 'true') return;
		dtEl.dataset.achieveTitleBound = 'true';
		dtEl.addEventListener('input', function() {
			saveAchieveWrapValue(dtEl.closest('.his-wrap'), blockId);
		});
	});
}

function closePrincipalDetailRow(principalEl, shouldFocus) {
	const row = principalEl?.querySelector('.principal-detail-row');
	const trigger = row?._principalDetailTrigger || principalEl?.querySelector('.btn-item[aria-expanded="true"]');
	row?.remove();
	principalEl?.querySelectorAll('.btn-item').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
	principalEl?.querySelectorAll('.list-wrap > ul > li.active').forEach(li => li.classList.remove('active'));
	if (shouldFocus) trigger?.focus();
}

function bindPrincipalDetailToggles(principalEl) {
	if (!principalEl?.classList.contains('tyB')) return;
	const list = principalEl.querySelector(':scope > .list-wrap > ul');
	if (!list) return;
	principalEl.querySelectorAll('.btn-item').forEach(btn => {
		if (btn._principalDetailToggleReady) return;
		btn._principalDetailToggleReady = true;
		btn.addEventListener('click', event => {
			if (event.target.closest('.principal-bio-edit-btn')) return;
			const itemEl = btn.closest('li');
			const detail = itemEl?.querySelector(':scope > .detail-data');
			if (!itemEl || !detail) return;
			event.preventDefault();
			event.stopPropagation();
			if (btn.getAttribute('aria-expanded') === 'true') {
				closePrincipalDetailRow(principalEl, false);
				return;
			}
			closePrincipalDetailRow(principalEl, false);
			const items = Array.from(list.children).filter(li => !li.classList.contains('detail-row'));
			const top = Math.round(itemEl.offsetTop);
			const sameRow = items.filter(li => Math.abs(Math.round(li.offsetTop) - top) < 5);
			const rowAnchor = sameRow[sameRow.length - 1] || itemEl;
			const detailRow = document.createElement('li');
			detailRow.className = 'detail-row principal-detail-row';
			detailRow._principalDetailTrigger = btn;
			detailRow.innerHTML = '<div class="inner" role="region" aria-live="polite"></div><button type="button" class="btn-close"><span class="hid">닫기</span></button>';
			const inner = detailRow.querySelector('.inner');
			inner.innerHTML = detail.innerHTML;
			inner.querySelectorAll('details').forEach(details => {
				details.open = true;
				details.querySelector(':scope > summary')?.remove();
			});
			detailRow.querySelector('.btn-close')?.addEventListener('click', event => {
				event.preventDefault();
				event.stopPropagation();
				closePrincipalDetailRow(principalEl, true);
			});
			rowAnchor.insertAdjacentElement('afterend', detailRow);
			bindPrincipalInlineDetailEditor(btn.closest('.builder-block')?.dataset.blockId, items.indexOf(itemEl), detailRow, itemEl);
			btn.setAttribute('aria-expanded', 'true');
			itemEl.classList.add('active');
		});
	});
}

function bindPrincipalInlineDetailEditor(blockId, itemIndex, detailRow, itemEl) {
	if (!blockId || itemIndex < 0 || !detailRow) return;
	const inner = detailRow.querySelector(':scope > .inner');
	if (!inner) return;
	inner.classList.add('principal-bio-editor-preview', 'principal-inline-detail-editor');
	inner.querySelectorAll('[data-edit-field]:not(.img):not(.term):not(dd), .list-wrap li > strong, .list-wrap li > p, dl.pri dt, dl.pri dd strong, dl.pri dd p, dl.his dt, dl.his dd li > strong, dl.his dd li .inr > p').forEach(field => {
		field.setAttribute('contenteditable', 'true');
		field.dataset.blockId = blockId;
		field.dataset.columnIndex = '0';
	});
	inner.querySelectorAll('dl.his dd ul').forEach(ul => decoratePrincipalTyBAchieveList(ul));
	decoratePrincipalBioTermEditors(inner);
	decoratePopupPreviewImageUploaders(inner);
	let savedOnce = false;
	const save = () => {
		const targetItems = getEditTargetItems(blockId);
		if (!targetItems?.[0]) return;
		if (!savedOnce) {
			pushHistory();
			savedOnce = true;
		}
		inner.querySelectorAll('[data-edit-field]').forEach(field => {
			targetItems[0][field.dataset.editField] = getCleanEditableFieldHtml(field);
		});
		targetItems[0][getPrincipalBioHtmlKey(itemIndex)] = getCleanPrincipalBioHtml(inner);
		const source = getPrincipalBioSource(itemEl);
		if (source) source.innerHTML = targetItems[0][getPrincipalBioHtmlKey(itemIndex)];
		updateMarkup();
	};
	inner.addEventListener('input', save);
	inner.addEventListener('click', event => {
		if (event.target.closest('.principal-tyb-year-actions, .principal-tyb-content-actions, .principal-term-actions')) {
			setTimeout(save, 0);
		}
	});
}

// 역대교장 tyB 상세 약력(학력/주요업적)의 연도/내용을 독립적으로 추가·삭제할 수
// 있게 한다. 연도 삭제는 <li> 전체(연도+내용)를, 내용 삭제는 그 연도 아래
// 문단(<p>) 하나만 지운다 — decoratePrincipalTyAYearList()의 tyB 대응 버전.
// 연도 버튼은 li:hover로 연도 라벨 아래에, 내용 버튼은 p:hover로 각 문단 끝에
// 인라인으로 붙어 두 버튼이 겹치지 않는다(contents_common.css 참고).
function decoratePrincipalTyBAchieveList(ul) {
	ul.querySelectorAll(':scope > li').forEach(li => {
		const strong = li.querySelector(':scope > strong');
		if (strong && strong.getAttribute('contenteditable') !== 'true') strong.setAttribute('contenteditable', 'true');
		if (!li.querySelector(':scope > .principal-tyb-year-actions')) {
			const actions = document.createElement('span');
			actions.className = 'principal-tyb-year-actions';
			actions.setAttribute('contenteditable', 'false');
			actions.innerHTML = '<button type="button" class="principal-tyb-year-btn principal-tyb-year-add" title="연도 추가" aria-label="연도 추가"><i class="ri-calendar-line" aria-hidden="true"></i></button><button type="button" class="principal-tyb-year-btn principal-tyb-year-remove" title="연도 삭제" aria-label="연도 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
			li.appendChild(actions);
		}
		const inr = li.querySelector(':scope > .inr');
		inr?.querySelectorAll(':scope > p').forEach(p => {
			if (p.getAttribute('contenteditable') !== 'true') p.setAttribute('contenteditable', 'true');
			if (!p.querySelector(':scope > .principal-tyb-content-actions')) {
				const actions = document.createElement('span');
				actions.className = 'principal-tyb-content-actions';
				actions.setAttribute('contenteditable', 'false');
				actions.innerHTML = '<button type="button" class="principal-tyb-content-btn principal-tyb-content-add" title="내용 추가" aria-label="내용 추가"><i class="ri-add-line" aria-hidden="true"></i></button><button type="button" class="principal-tyb-content-btn principal-tyb-content-remove" title="내용 삭제" aria-label="내용 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
				p.appendChild(actions);
			}
		});
	});
	// 리스너 부착 여부는 dataset(HTML 속성)이 아니라 JS 프로퍼티로만 표시한다.
	// dataset로 표시하면 getCleanPrincipalBioHtml()이 이 ul을 저장/재생성용
	// 마크업으로 복제할 때 "true" 값이 그대로 딸려가, 이후 그 마크업으로 새로
	// 만들어진 (리스너가 실제로는 없는) ul도 "이미 붙어있다"고 오인해 리스너를
	// 다시 붙이지 않는 문제가 있었다(약력을 닫았다 다시 열면 추가/삭제 버튼이
	// 반응하지 않던 원인). JS 프로퍼티는 cloneNode/innerHTML에 절대 복제되지
	// 않으므로 이 문제가 생기지 않는다.
	if (ul._tybAchieveListBound) return;
	ul._tybAchieveListBound = true;
	ul.addEventListener('click', event => {
		const yearAdd = event.target.closest('.principal-tyb-year-add');
		const yearRemove = event.target.closest('.principal-tyb-year-remove');
		const contentAdd = event.target.closest('.principal-tyb-content-add');
		const contentRemove = event.target.closest('.principal-tyb-content-remove');
		if (!yearAdd && !yearRemove && !contentAdd && !contentRemove) return;
		event.preventDefault();
		event.stopPropagation();
		const li = event.target.closest('li');
		if (!li) return;
		if (yearAdd) {
			const li2 = document.createElement('li');
			li2.innerHTML = '<strong>연도</strong><div class="inr"><p>내용을 입력하세요.</p></div>';
			li.insertAdjacentElement('afterend', li2);
			decoratePrincipalTyBAchieveList(ul);
			li2.querySelector(':scope > strong')?.focus();
			return;
		}
		if (yearRemove) {
			if (ul.querySelectorAll(':scope > li').length <= 1) return;
			const focusTarget = li.nextElementSibling || li.previousElementSibling;
			li.remove();
			focusTarget?.querySelector(':scope > strong')?.focus();
			return;
		}
		const p = event.target.closest('p');
		const inr = li.querySelector(':scope > .inr');
		if (contentAdd) {
			const newP = document.createElement('p');
			newP.textContent = '내용을 입력하세요.';
			if (p) p.insertAdjacentElement('afterend', newP);
			else inr?.appendChild(newP);
			decoratePrincipalTyBAchieveList(ul);
			newP.focus();
			return;
		}
		if (contentRemove) {
			if (!inr || inr.querySelectorAll(':scope > p').length <= 1) return;
			const focusTarget = (p.previousElementSibling?.tagName === 'P' && p.previousElementSibling)
				|| (p.nextElementSibling?.tagName === 'P' && p.nextElementSibling)
				|| li.querySelector(':scope > strong');
			p.remove();
			focusTarget?.focus();
		}
	});
}

function addPrincipalCanvasControls() {
	document.querySelectorAll('.builder-block').forEach(blockEl => {
		const blockId = blockEl.dataset.blockId;
		const block = state.blocks.find(b => b.id === blockId);
		if (!block || templateCategories[block.type] !== 'principal') return;
		const principalEl = blockEl.querySelector('.pri-his');
		if (!principalEl || blockEl.querySelector('.principal-add-item-btn')) return;
		getPrincipalItemNodes(principalEl).forEach(preparePrincipalBioSource);
		// principal-tyC(카드형, 이미지 없음)는 재임기간이 한 줄로 고정된 단순 텍스트라
		// 재임기간 추가/삭제(복수 재임기간 관리용) 버튼이 필요 없다. .term 클래스 자체는
		// CSS 스타일링에 쓰이므로 마크업은 그대로 두고, 이 데코레이터만 건너뛴다.
		if (block.type !== 'principal-tyC') decoratePrincipalTermEditors(principalEl, blockId);
		decoratePrincipalAchieveRows(principalEl, blockId);
		decoratePrincipalImageUploaders(principalEl, blockId);
		const addRow = document.createElement('div');
		addRow.className = 'pstep-add-row principal-add-item-row';
		const addBtn = document.createElement('button');
		addBtn.type = 'button';
		addBtn.className = 'pstep-add-btn principal-add-item-btn';
		addBtn.innerHTML = '<i class="ri-add-line" aria-hidden="true"></i><span>교장 추가</span>';
		addBtn.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			addPrincipalItem(blockId);
		});
		addRow.appendChild(addBtn);
		principalEl.appendChild(addRow);

		// 최소 1개는 남아야 하므로, 남은 항목이 1개뿐이면 그 항목엔 삭제 버튼을
		// 달지 않는다. 그 외에는(원래 템플릿에 있던 기본 항목이든, "교장 추가"로
		// 새로 만든 항목이든 구분 없이) 전부 hover 시 삭제 버튼이 나온다.
		const totalPrincipalItems = getPrincipalItemNodes(principalEl).length;
		getPrincipalItemNodes(principalEl).forEach((itemEl, idx) => {
			if (totalPrincipalItems > 1 && !itemEl.querySelector(':scope > .principal-item-remove-btn')) {
				const removeBtn = document.createElement('button');
				removeBtn.type = 'button';
				removeBtn.className = 'principal-item-remove-btn';
				removeBtn.innerHTML = '<i class="ri-delete-bin-line" aria-hidden="true"></i><span>삭제</span>';
				removeBtn.addEventListener('click', event => {
					event.preventDefault();
					event.stopPropagation();
					removePrincipalItem(blockId, itemEl);
				});
				itemEl.appendChild(removeBtn);
			}
			if (!getPrincipalBioPopup(itemEl)) return;
			// tyB(상세 약력 인라인 확장형)는 목록 클릭만으로 이미 펼침+편집이 되므로
			// 중복되는 "약력편집" 버튼을 따로 만들지 않는다. 아래는 그 외(별도
			// 약력팝업을 쓰는) 유형에만 해당한다.
			if (isPrincipalDetailBio(itemEl)) return;
			if (itemEl.querySelector('.principal-bio-edit-btn')) return;
			const viewBtn = itemEl.querySelector('.btn-view');
			const editBtn = document.createElement('button');
			editBtn.type = 'button';
			editBtn.className = 'principal-bio-edit-btn';
			editBtn.innerHTML = '<i class="ri-edit-box-line" aria-hidden="true"></i><span>약력팝업 내용 편집</span>';
			editBtn.addEventListener('click', event => {
				event.preventDefault();
				event.stopPropagation();
				openPrincipalBioEditor(blockId, idx);
			});
			if (viewBtn) viewBtn.insertAdjacentElement('afterend', editBtn);
			else itemEl.appendChild(editBtn);
		});

		bindPrincipalDetailToggles(principalEl);
		bindPrincipalTyAListPopup(principalEl, blockId);
	});
}

/* =================================================================
   역대교장 tyA(목록형) 캔버스 내 "약력보기" 팝업을 document.body로
   옮겨서 여는 기능 — 구현 배경 정리
   -----------------------------------------------------------------
   [문제] 빌더 캔버스의 최상위 컨테이너 .canvas-grid 에는 반응형
   미리보기(태블릿/모바일 폭 전환)를 위한 CSS 컨테이너 쿼리 용도로
   `container-type: inline-size` 가 걸려 있다(contents_common.css).
   CSS 스펙상 container-type 이 normal 이 아니면 그 요소에는 자동으로
   contain:layout 도 함께 적용되는데, contain:layout 이 걸린 요소는
   transform 이 걸린 요소와 마찬가지로 하위 position:fixed 요소의
   기준(containing block)이 되어버린다.
   그 결과 팝업(.pri-his.popup, sub_com.css 기준 position:fixed;
   width:100%; height:100%)이 캔버스 트리 안 어디에 있든(li 안이든,
   list-wrap 밖이든) 브라우저 전체 화면이 아니라 .canvas-grid 박스
   기준으로만 위치/크기가 계산되어, 배포 페이지(03_역대교장A_list.jsp)
   처럼 화면 전체를 덮는 오버레이로 보이지 않는 문제가 있었다.
   [해결] 팝업을 열 때 실제 DOM 노드를 document.body 의 바로 아래로
   옮겨 .canvas-grid 의 컨테인먼트 범위를 완전히 벗어나게 한다.
   (principal-tyB 의 기존 "약력 편집" 모달이 document.body 에 직접
   appendChild 하던 방식과 동일한 우회 방법 — 그쪽도 같은 문제를
   이미 이렇게 피해가고 있었다.)
   [재렌더 처리] 캔버스는 render() 가 호출될 때마다 canvasGrid.innerHTML
   을 통째로 새로 그리므로, body 로 옮겨둔 옛 팝업 DOM은 그 시점에 쓸모가
   없어진다(내용을 최신 상태로 다시 만들어주는 새 팝업 노드가 어차피
   생성되기 때문). 그래서 "지금 열려 있어야 하는 블록 id + 항목 suffix"만
   별도 변수로 기억해 두고, render() 시작 시점에는 옛 팝업 DOM만 버린 뒤,
   렌더가 끝나고 이 함수가 다시 호출될 때 같은 항목이면 최신 팝업 노드로
   자동 재오픈한다.
   [항목별 내용 표시 + 명시적 저장] "약력보기"는 항목마다 다른 기수/성명/
   재임기간을 보여줘야 하지만, 팝업 자체는 03_역대교장A_list.jsp 와 동일하게
   블록당 1개만 존재한다(자세한 배경은 principal-tyA-list 템플릿 관련 이전
   대화 참고). 그래서 팝업 DOM 자체에는 특정 항목의 데이터를 상시 바인딩해
   두지 않고, 아래와 같은 "그때그때 채워넣기" 방식을 쓴다.
     1) "약력보기" 클릭 → populatePrincipalTyAPopupFromItem() 이 클릭된
        <li>의 현재 기수(order)/성명(name)/재임기간(term)/사진(photo)과,
        그 항목에 저장돼 있던 학력·주요업적(principalAchieve{suffix}, 없으면
        템플릿 기본값)을 팝업에 채워 넣는다. suffix는 그 항목의
        order{suffix}/name{suffix}/... data-edit-field 숫자를 그대로 쓴다.
     2) 팝업 안에서는 자유롭게 수정 가능(기수/성명/재임기간은 contenteditable,
        학력/주요업적은 연도·내용 추가/삭제 가능) 하지만, 입력 즉시 저장하지
        않는다 — 리스트 위젯처럼 실시간 저장하면 "취소" 개념이 없어지기 때문.
     3) 캔버스에서만 보이는 "저장" 버튼(수출되는 정적 마크업에는 절대 포함되지
        않음 — index.html 템플릿이 아니라 이 JS가 캔버스에 붙일 때만 만들어
        붙이므로 배포/마크업보기 경로에는 애초에 존재하지 않는다)을 눌러야
        savePrincipalTyAPopup() 이 팝업의 현재 내용을 클릭했던 그 항목의
        order{suffix}/name{suffix}/term{suffix}/photo{suffix} 와
        principalAchieve{suffix} 에 반영하고 render() 로 리스트 카드에도
        즉시 반영한다. 저장하지 않고 닫으면 편집 내용은 버려진다.
   ================================================================= */

// 클릭된 <li>가 몇 번째 항목인지(=order{suffix}/name{suffix}/...의 숫자)를
// 알아낸다. 팝업에 채워 넣거나 저장할 때 이 suffix로 그 항목의 필드를
// 정확히 짚어낸다.
function getPrincipalItemSuffix(itemEl) {
	const orderField = itemEl?.querySelector(':scope > .inner [data-edit-field^="order"]');
	return orderField?.dataset.editField?.match(/\d+$/)?.[0] || null;
}

// 아직 한 번도 저장된 적 없는 항목(예: "교장 추가"로 새로 만든 항목)의
// 학력/주요업적 기본값 — 템플릿 원본(componentTemplates)의 팝업 마크업에서
// 그대로 가져온다.
function getPrincipalTyADefaultAchieveHtml(blockType) {
	const wrap = componentTemplates[blockType]?.element
		?.querySelector(':scope > .pri-his.popup > .popup-wrap > .list-wrap');
	return wrap ? wrap.innerHTML : '';
}

// "약력보기" 클릭 시점에 팝업 내용을 클릭된 항목 기준으로 채워 넣는다.
// 반환값(suffix)이 null이면(=order 필드를 못 찾으면) 호출부에서 팝업을 열지 않는다.
function populatePrincipalTyAPopupFromItem(popup, itemEl, item, blockType) {
	const suffix = getPrincipalItemSuffix(itemEl);
	if (!suffix) return null;

	const infoWrap = popup.querySelector(':scope > .popup-wrap > .info-wrap');
	if (infoWrap) {
		const fieldPairs = [
			[itemEl.querySelector(`[data-edit-field="photo${suffix}"]`), infoWrap.querySelector(':scope > .img')],
			[itemEl.querySelector(`[data-edit-field="order${suffix}"]`), infoWrap.querySelector('.order')],
			[itemEl.querySelector(`[data-edit-field="name${suffix}"]`), infoWrap.querySelector(':scope > .info > p')],
			[itemEl.querySelector(`[data-edit-field="term${suffix}"]`), infoWrap.querySelector('.term')]
		];
		// 메인 리스트의 term 필드에 과거 편집 중 캔버스 전용 추가/삭제 버튼이
		// 실수로 함께 저장돼 있었더라도(getCleanEditableFieldHtml 참고),
		// 팝업으로 옮겨 보여줄 때는 항상 정리한 값만 사용한다.
		fieldPairs.forEach(([src, dst]) => { if (src && dst) dst.innerHTML = getCleanEditableFieldHtml(src); });
	}

	const achieveWrap = popup.querySelector(':scope > .popup-wrap > .list-wrap');
	if (achieveWrap) {
		const saved = item?.[`principalAchieve${suffix}`];
		// 예전 버전에서 저장됐거나 편집 중 어떤 이유로 연도(<li><strong>)/
		// 내용(<p>) 구조가 깨진 값이 있으면, 연도·내용 추가/삭제 버튼이 그
		// 구조를 전제로 동작하기 때문에 클릭해도 반응이 없는 것처럼 보인다.
		// 그런 값은 쓰지 않고 템플릿 기본값으로 대체해 항상 정상 구조로 연다.
		achieveWrap.innerHTML = isPrincipalTyAAchieveHtmlUsable(saved) ? saved : getPrincipalTyADefaultAchieveHtml(blockType);
	}
	return suffix;
}

// principalAchieve{suffix}로 저장된 값이 연도(<li> > <strong>)/내용(<li> > <p>)
// 구조를 최소 1개라도 갖추고 있는지 확인한다. 이 구조가 없으면
// decoratePrincipalTyAYearList()의 추가/삭제 버튼이 대상 <li>/<p>를 찾지
// 못해 클릭해도 아무 일도 일어나지 않는다.
function isPrincipalTyAAchieveHtmlUsable(html) {
	if (!html) return false;
	const probe = document.createElement('div');
	probe.innerHTML = html;
	return !!probe.querySelector('ul > li > strong') && !!probe.querySelector('ul > li > p');
}

// 기수(.order)/성명(.info > p)/재임기간(.term)을 그냥 눌러서 바로 고칠 수
// 있는 단순 contenteditable 텍스트로 만든다. (요청사항 1: 재임기간에 마우스
// 올렸을 때 나오던 "추가/삭제" 버튼은 여기서 만들지 않으므로 애초에 나오지
// 않는다 — 그 버튼은 decoratePrincipalTermEditors() 가 data-edit-field 를
// 가진 .term 에만 붙이는데, 팝업의 .term 은 더 이상 data-edit-field 를
// 갖지 않기 때문에 대상에서 자동으로 제외된다.)
function decoratePrincipalTyAPopupInfoEditable(popup) {
	const infoWrap = popup.querySelector(':scope > .popup-wrap > .info-wrap');
	if (!infoWrap) return;
	[infoWrap.querySelector('.order'), infoWrap.querySelector(':scope > .info > p'), infoWrap.querySelector('.term')]
		.forEach(el => { if (el && el.getAttribute('contenteditable') !== 'true') el.setAttribute('contenteditable', 'true'); });
	decoratePrincipalTyAPopupImagePicker(infoWrap);
}

// "약력보기" 팝업의 사진: 클릭하면 콘텐츠 파일 관리 팝업에서 이미지를 선택해
// 바꿀 수 있다. 기수/성명/재임기간과 마찬가지로 여기서는 DOM만 바꾸고,
// 실제 저장은 "저장" 버튼(savePrincipalTyAPopup)이 눌렸을 때 처리된다.
function decoratePrincipalTyAPopupImagePicker(infoWrap) {
	const imgWrap = infoWrap.querySelector(':scope > .img');
	if (!imgWrap || imgWrap.dataset.tyaImgPickerReady === 'true') return;
	imgWrap.dataset.tyaImgPickerReady = 'true';
	imgWrap.title = '이미지 클릭 후 콘텐츠 파일에서 선택';
	imgWrap.setAttribute('role', 'button');
	imgWrap.setAttribute('tabindex', '0');
	// 클릭→팝업 열기→선택한 파일을 img src에 반영하는 배관은 공용 모듈
	// (CntntsFileManager, id="imgFileUpOpen*")에 맡긴다. 이 팝업은 "저장" 버튼을
	// 눌러야 실제 state에 커밋되므로(savePrincipalTyAPopup), 여기서는 별도
	// 콜백/이벤트 리스너 없이 DOM 반영만으로 충분하다 — 저장 시점에
	// infoWrap의 현재 .img innerHTML을 그대로 읽어가기 때문이다.
	// (discardStalePrincipalTyAPopupNode()가 항상 이 팝업을 document.body에 하나만
	// 남기므로 이 id는 실질적으로 항상 유일하다.)
	imgWrap.id = 'imgFileUpOpen_tyaPopup';
	CntntsFileManager.wireImgTriggers(infoWrap);
}

// 이전 렌더에서 body 로 옮겨졌던 팝업 DOM 노드를 버린다.
// _principalTyAOpenPopupBlockId/_principalTyAOpenPopupSuffix 플래그 자체는
// 건드리지 않으므로, 열려 있던 팝업은 이번 렌더 이후
// bindPrincipalTyAListPopup()에서 새 노드로 다시 열린다. render() 맨 앞에서
// 반드시 호출해야 한다.
function discardStalePrincipalTyAPopupNode() {
	document.querySelectorAll('body > .pri-his.popup').forEach(el => el.remove());
}

// 팝업을 클릭된 항목(itemEl) 기준으로 채운 뒤 document.body로 옮겨서 연다.
// 다른 tyA-list 팝업이 이미 body에 열려 있다면(다른 블록/항목으로 바로
// 전환한 경우) 먼저 정리한다.
function openPrincipalTyAPopup(popup, blockId, itemEl) {
	discardStalePrincipalTyAPopupNode();
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	const item = getEditTargetItems(blockId)?.[0];
	const suffix = populatePrincipalTyAPopupFromItem(popup, itemEl, item, block?.type);
	if (!suffix) return;
	decoratePrincipalTyAPopupInfoEditable(popup);
	decoratePrincipalTyAPopupAchieve(popup);
	_principalTyAOpenPopupBlockId = blockId;
	_principalTyAOpenPopupSuffix = suffix;
	document.body.appendChild(popup);
	popup.classList.add('is-canvas-open');
	// body로 옮겨진 뒤에는 .builder-block 스코프 CSS가 더 이상 적용되지
	// 않으므로, 표시 여부는 인라인 스타일로 직접 제어한다.
	// (sub_com.css의 align-content/justify-items는 grid 정렬 속성이므로
	// display도 grid로 맞춰야 배포 페이지와 동일하게 중앙 정렬된다.)
	popup.style.display = 'grid';
	popup.setAttribute('aria-hidden', 'false');
}

// 사용자가 닫기 버튼/바깥(딤 배경) 클릭으로 "저장하지 않고" 닫을 때 호출한다.
// discardStalePrincipalTyAPopupNode()와 달리 열림 상태 플래그까지 초기화해
// 재렌더 후에도 다시 열리지 않게 하고, 편집 중이던 내용은 그대로 버린다.
function closePrincipalTyAPopup() {
	_principalTyAOpenPopupBlockId = null;
	_principalTyAOpenPopupSuffix = null;
	discardStalePrincipalTyAPopupNode();
}

// 캔버스 전용 "저장" 버튼 클릭 시 호출된다. 팝업에 지금 표시된 내용을
// 열 때 기억해 둔 suffix(=클릭했던 그 항목)의 필드에 반영한다.
function savePrincipalTyAPopup(popup, blockId) {
	const suffix = _principalTyAOpenPopupSuffix;
	if (!suffix) return;
	const item = getEditTargetItems(blockId)?.[0];
	if (!item) return;
	pushHistory();

	const infoWrap = popup.querySelector(':scope > .popup-wrap > .info-wrap');
	if (infoWrap) {
		const fieldPairs = [
			['photo', infoWrap.querySelector(':scope > .img')],
			['order', infoWrap.querySelector('.order')],
			['name', infoWrap.querySelector(':scope > .info > p')],
			['term', infoWrap.querySelector('.term')]
		];
		fieldPairs.forEach(([prefix, el]) => { if (el) item[`${prefix}${suffix}`] = el.innerHTML; });
		// "몇 대 교장" 텍스트를 팝업에서 직접 저장했다는 표시. 이 플래그가
		// 있으면 syncPrincipalOrderNumbers()가 항목 추가/삭제 시 위치 기준으로
		// 자동 재계산하지 않고 이 값을 그대로 유지한다.
		if (infoWrap.querySelector('.order')) item[`orderManual${suffix}`] = true;
	}
	const achieveWrap = popup.querySelector(':scope > .popup-wrap > .list-wrap');
	if (achieveWrap) item[`principalAchieve${suffix}`] = cleanPrincipalTyAAchieveHtml(achieveWrap);

	closePrincipalTyAPopup();
	render();
}

function bindPrincipalTyAListPopup(principalEl, blockId) {
	const popup = getPrincipalTyAListPopup(principalEl);
	if (!popup) return;
	if (popup.dataset.tyaPopupBound !== 'true') {
		popup.dataset.tyaPopupBound = 'true';
		// 배포 페이지 sub_com.js 와 동일하게 .popup-wrap 바깥(딤 배경) 클릭 시,
		// 저장하지 않고 닫는다.
		// (.bg 는 팝업 카드 내부의 장식용 이미지일 뿐 배경 오버레이가 아니므로 대상에서 제외)
		popup.addEventListener('click', event => {
			if (event.target.closest('.popup-wrap')) return;
			event.preventDefault();
			event.stopPropagation();
			closePrincipalTyAPopup();
		});
		popup.querySelector(':scope > .popup-wrap > .btn-close')?.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			closePrincipalTyAPopup();
		});
		// 요청사항 2: 캔버스에서만 보이는 저장 버튼. 정적 템플릿(index.html)에는
		// 없고 여기서 JS로만 생성해 붙이므로, "마크업 보기"/배포용 내보내기
		// 경로(_renderBlockExportHtml, buildColumnBlock의 !editable 분기)는
		// 이 함수 자체를 호출하지 않아 결과물에 절대 포함되지 않는다.
		const saveBtn = document.createElement('button');
		saveBtn.type = 'button';
		saveBtn.className = 'principal-tya-popup-save-btn';
		saveBtn.innerHTML = '<i class="ri-save-line" aria-hidden="true"></i><span>저장</span>';
		saveBtn.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			savePrincipalTyAPopup(popup, blockId);
		});
		popup.querySelector(':scope > .popup-wrap')?.appendChild(saveBtn);
	}
	getPrincipalItemNodes(principalEl).forEach(itemEl => {
		const viewBtn = itemEl.querySelector(':scope > .btn-view');
		if (!viewBtn || viewBtn.dataset.tyaViewBound === 'true') return;
		viewBtn.dataset.tyaViewBound = 'true';
		viewBtn.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			openPrincipalTyAPopup(popup, blockId, itemEl);
		});
	});
	// 캔버스 재렌더(render()) 뒤에도, 편집 중이던 항목이면 같은 항목을 다시
	// 찾아 최신 팝업 노드로 이어서 연다. (일반적으로는 팝업 안 편집이 더 이상
	// render()를 유발하지 않으므로 잘 쓰이지 않는 안전망이지만, 다른 조작으로
	// 캔버스가 재렌더되는 경우까지 대비한다.)
	if (_principalTyAOpenPopupBlockId === blockId && _principalTyAOpenPopupSuffix) {
		const itemEl = getPrincipalItemNodes(principalEl)
			.find(el => getPrincipalItemSuffix(el) === _principalTyAOpenPopupSuffix);
		if (itemEl) openPrincipalTyAPopup(popup, blockId, itemEl);
	}
}

// 팝업 안 학력/주요업적 목록에 연도/내용 추가·삭제 UI를 붙인다. 여기서는
// DOM만 바꾸고 state.blocks에는 아무것도 저장하지 않는다 — 실제 저장은
// "저장" 버튼(savePrincipalTyAPopup)을 눌렀을 때 팝업의 현재 DOM 상태를
// 통째로 읽어가는 방식이라, 실시간 자동저장이 필요 없다.
function decoratePrincipalTyAPopupAchieve(popup) {
	const wrap = popup.querySelector(':scope > .popup-wrap > .list-wrap');
	if (!wrap) return;
	wrap.querySelectorAll(':scope > ul').forEach(ul => decoratePrincipalTyAYearList(ul));
}

function cleanPrincipalTyAAchieveHtml(wrap) {
	const clean = wrap.cloneNode(true);
	clean.querySelectorAll('.principal-tya-year-actions, .principal-tya-content-actions').forEach(el => el.remove());
	clean.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
	return clean.innerHTML;
}

function decoratePrincipalTyAYearList(ul) {
	ul.querySelectorAll(':scope > li').forEach(li => {
		const strong = li.querySelector(':scope > strong');
		if (strong && strong.getAttribute('contenteditable') !== 'true') strong.setAttribute('contenteditable', 'true');
		if (!li.querySelector(':scope > .principal-tya-year-actions')) {
			const actions = document.createElement('span');
			actions.className = 'principal-tya-year-actions';
			actions.setAttribute('contenteditable', 'false');
			actions.innerHTML = '<button type="button" class="principal-tya-year-btn principal-tya-year-add" title="연도 추가" aria-label="연도 추가"><i class="ri-calendar-line" aria-hidden="true"></i></button><button type="button" class="principal-tya-year-btn principal-tya-year-remove" title="연도 삭제" aria-label="연도 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
			if (strong) strong.insertAdjacentElement('afterend', actions);
			else li.insertAdjacentElement('afterbegin', actions);
		}
		li.querySelectorAll(':scope > p').forEach(p => {
			if (p.getAttribute('contenteditable') !== 'true') p.setAttribute('contenteditable', 'true');
			if (!p.querySelector(':scope > .principal-tya-content-actions')) {
				const actions = document.createElement('span');
				actions.className = 'principal-tya-content-actions';
				actions.setAttribute('contenteditable', 'false');
				actions.innerHTML = '<button type="button" class="principal-tya-content-btn principal-tya-content-add" title="내용 추가" aria-label="내용 추가"><i class="ri-add-line" aria-hidden="true"></i></button><button type="button" class="principal-tya-content-btn principal-tya-content-remove" title="내용 삭제" aria-label="내용 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
				p.appendChild(actions);
			}
		});
	});
	// tyB 쪽과 동일한 이유로 dataset이 아닌 JS 프로퍼티로만 표시한다 — 이 값이
	// dataset이면 cleanPrincipalTyAAchieveHtml()로 저장된 뒤 populatePrincipalTyAPopupFromItem()이
	// 그 저장값으로 팝업을 다시 채울 때 "true"가 그대로 딸려와, 리스너가 실제로는
	// 없는 새 ul도 이미 붙어있다고 오인해 추가/삭제 버튼이 반응하지 않게 된다.
	if (ul._tyaYearListBound) return;
	ul._tyaYearListBound = true;
	ul.addEventListener('click', event => {
		const yearAdd = event.target.closest('.principal-tya-year-add');
		const yearRemove = event.target.closest('.principal-tya-year-remove');
		const contentAdd = event.target.closest('.principal-tya-content-add');
		const contentRemove = event.target.closest('.principal-tya-content-remove');
		if (!yearAdd && !yearRemove && !contentAdd && !contentRemove) return;
		event.preventDefault();
		event.stopPropagation();
		const li = event.target.closest('li');
		if (!li) return;
		if (yearAdd) {
			const li2 = document.createElement('li');
			li2.innerHTML = '<strong>연도</strong><p>내용을 입력하세요.</p>';
			li.insertAdjacentElement('afterend', li2);
			decoratePrincipalTyAYearList(ul);
			li2.querySelector(':scope > strong')?.focus();
			return;
		}
		if (yearRemove) {
			if (ul.querySelectorAll(':scope > li').length <= 1) return;
			const focusTarget = li.nextElementSibling || li.previousElementSibling;
			li.remove();
			focusTarget?.querySelector(':scope > strong')?.focus();
			return;
		}
		const p = event.target.closest('p');
		if (contentAdd) {
			const newP = document.createElement('p');
			newP.textContent = '내용을 입력하세요.';
			p.insertAdjacentElement('afterend', newP);
			decoratePrincipalTyAYearList(ul);
			newP.focus();
			return;
		}
		if (contentRemove) {
			if (li.querySelectorAll(':scope > p').length <= 1) return;
			const focusTarget = (p.previousElementSibling?.tagName === 'P' && p.previousElementSibling)
				|| (p.nextElementSibling?.tagName === 'P' && p.nextElementSibling)
				|| li.querySelector(':scope > strong');
			p.remove();
			focusTarget?.focus();
		}
	});
}

function decorateGreetingImageUploaders(root, blockId) {
	// greeting-tyA-img/tyB-img/tyC/tyC-img의 인물·오브젝트 이미지는 콘텐츠 파일
	// 관리 팝업(CntntsFileManager)에서 바로 선택하도록 한다. 클릭→팝업 열기→img
	// src 반영은 공용 모듈(id="imgFileUpOpen*")에 맡기고, 여기서는 반영 완료 후
	// 오는 'imgFileUpApplied' 이벤트를 받아 이 블록의 state에 저장하는 부분만
	// 담당한다.
	root.querySelectorAll('.img[data-edit-field], .obj[data-edit-field]').forEach(imgWrap => {
		if (imgWrap.dataset.principalUploadReady === 'true') return;
		imgWrap.dataset.principalUploadReady = 'true';
		imgWrap.setAttribute('role', 'button');
		imgWrap.setAttribute('tabindex', '0');
		imgWrap.title = '이미지 클릭 후 콘텐츠 파일에서 선택';
		imgWrap.id = 'imgFileUpOpen_' + blockId + '_' + imgWrap.dataset.editField;
		imgWrap.addEventListener('imgFileUpApplied', event => {
			const fieldName = imgWrap.dataset.editField;
			const targetItems = getEditTargetItems(blockId);
			if (!fieldName || !targetItems?.[0]) return;
			pushHistory();
			const alt = imgWrap.querySelector('img')?.getAttribute('alt') || event.detail.fileName || '';
			const hasP = !!imgWrap.querySelector('p');
			targetItems[0][fieldName] = hasP
				? `<p><img src="${escapeAttr(event.detail.fileSrc)}" alt="${escapeAttr(alt)}"></p>`
				: `<img src="${escapeAttr(event.detail.fileSrc)}" alt="${escapeAttr(alt)}">`;
			render();
		});
	});
	CntntsFileManager.wireImgTriggers(root);
}

function addGreetingCanvasControls() {
	document.querySelectorAll('.builder-block').forEach(blockEl => {
		const blockId = blockEl.dataset.blockId;
		const block = state.blocks.find(b => b.id === blockId);
		if (!block || templateCategories[block.type] !== 'greeting') return;
		const greetingEl = blockEl.querySelector('.greeting');
		if (!greetingEl) return;
		decorateGreetingImageUploaders(greetingEl, blockId);
	});
}

function addSymbolCanvasControls() {
	document.querySelectorAll('.builder-block').forEach(blockEl => {
		const blockId = blockEl.dataset.blockId;
		const block = state.blocks.find(b => b.id === blockId);
		if (!block || templateCategories[block.type] !== 'symbol') return;
		decoratePrincipalImageUploaders(blockEl, blockId);
	});
}

function getHistoryTypeASlideNodes(root) {
	return Array.from(root?.querySelectorAll(':scope .list .swiper-slide') || []);
}

function getHistoryTypeATimelineNodes(root) {
	return Array.from(root?.querySelectorAll(':scope .timeline .swiper-slide') || []);
}

function getHistoryTypeADefaultCount(type) {
	return getHistoryTypeASlideNodes(componentTemplates[type]?.element).length || 1;
}

function getHistoryTypeAFieldCounters(root) {
	const counters = {};
	root.querySelectorAll('[data-edit-field]').forEach(field => {
		const name = field.dataset.editField || '';
		const prefix = name.replace(/\d+$/, '') || 'field';
		const num = Number(name.match(/\d+$/)?.[0] || 0);
		counters[prefix] = Math.max(counters[prefix] || 0, num);
	});
	return counters;
}

function mergeHistoryTypeAItemCounters(counters, item) {
	Object.keys(item || {}).forEach(name => {
		const prefix = name.replace(/\d+$/, '') || 'field';
		if (prefix !== 'list-item' && prefix !== 'list-date') return;
		const num = Number(name.match(/\d+$/)?.[0] || 0);
		counters[prefix] = Math.max(counters[prefix] || 0, num);
	});
	return counters;
}

function parseHistoryTypeAYearNumber(text) {
	const num = Number(String(text || '').match(/\d+/)?.[0]);
	return Number.isFinite(num) && num > 0 ? num : null;
}

function getHistoryTypeANextYearLabel(histEl) {
	const timelineSlides = getHistoryTypeATimelineNodes(histEl);
	const lastSlide = timelineSlides[timelineSlides.length - 1];
	const lastText = lastSlide?.querySelector('[data-edit-field]')?.textContent;
	const lastNum = parseHistoryTypeAYearNumber(lastText);
	return String(lastNum != null ? lastNum + 1 : new Date().getFullYear());
}

function applyHistoryTypeAItemCount(root, block, item) {
	if (!root?.classList?.contains('history') || !root.classList.contains('tyA')) return;
	const listSlides = getHistoryTypeASlideNodes(root);
	const timelineSlides = getHistoryTypeATimelineNodes(root);
	if (!listSlides.length || !timelineSlides.length) return;
	const targetCount = Math.max(listSlides.length, block.historyYearCount || listSlides.length);
	const listParent = listSlides[0].parentElement;
	const timelineParent = timelineSlides[0].parentElement;
	const listTemplate = listSlides[listSlides.length - 1];
	const timelineTemplate = timelineSlides[timelineSlides.length - 1];
	const counters = mergeHistoryTypeAItemCounters(getHistoryTypeAFieldCounters(root), item);
	let lastYearNum = parseHistoryTypeAYearNumber(timelineTemplate.querySelector('[data-edit-field]')?.textContent);
	for (let i = listSlides.length; i < targetCount; i++) {
		lastYearNum = lastYearNum != null ? lastYearNum + 1 : new Date().getFullYear();
		const yearText = String(lastYearNum);
		const listClone = listTemplate.cloneNode(true);
		listClone.classList.remove('swiper-slide-active');
		listClone.dataset.year = yearText;
		listClone.querySelectorAll('[data-edit-field]').forEach(field => {
			const prefix = (field.dataset.editField || '').replace(/\d+$/, '') || 'field';
			const nextName = `${prefix}${++counters[prefix]}`;
			field.dataset.editField = nextName;
			if (prefix === 'list-date') field.textContent = '02.07 - 02.08';
			if (prefix === 'list-item') field.textContent = '연혁 내용을 입력하세요.';
			if (item[nextName] == null) item[nextName] = field.innerHTML;
		});
		const timelineClone = timelineTemplate.cloneNode(true);
		timelineClone.classList.remove('swiper-slide-active');
		timelineClone.querySelectorAll('[data-edit-field]').forEach(field => {
			const prefix = (field.dataset.editField || '').replace(/\d+$/, '') || 'field';
			const nextName = `${prefix}${++counters[prefix]}`;
			field.dataset.editField = nextName;
			field.textContent = yearText;
			if (item[nextName] == null) item[nextName] = field.innerHTML;
		});
		listParent.appendChild(listClone);
		timelineParent.appendChild(timelineClone);
	}
	getHistoryTypeASlideNodes(root).forEach((slide, idx) => {
		const saved = item?.[`historyListSlideHtml${idx + 1}`];
		if (saved) slide.innerHTML = saved;
	});
}

function cleanHistoryTypeASlideHtml(slide) {
	const clean = slide.cloneNode(true);
	clean.querySelectorAll('.history-row-actions').forEach(el => el.remove());
	clean.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
	clean.querySelectorAll('[data-block-id]').forEach(el => el.removeAttribute('data-block-id'));
	clean.querySelectorAll('[data-column-index]').forEach(el => el.removeAttribute('data-column-index'));
	return clean.innerHTML;
}

function saveHistoryTypeASlideHtml(blockId, slide) {
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	if (!block || templateCategories[block.type] !== 'history') return;
	const item = block.items?.[0];
	const slides = getHistoryTypeASlideNodes(slide.closest('.history'));
	const idx = slides.indexOf(slide);
	if (!item || idx < 0) return;
	item[`historyListSlideHtml${idx + 1}`] = cleanHistoryTypeASlideHtml(slide);
	updateMarkup();
}

function getNextHistoryListPairKey(item, prefix) {
	let max = 0;
	const re = new RegExp(`^${prefix}(\\d+)$`);
	Object.keys(item || {}).forEach(key => {
		const num = Number(String(key).match(re)?.[1] || 0);
		max = Math.max(max, num);
	});
	return `${prefix}${max + 1}`;
}

function decorateHistoryTypeASlideRows(histEl, blockId) {
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	const item = block?.items?.[0];
	if (!item) return;
	getHistoryTypeASlideNodes(histEl).forEach(slide => {
		slide.querySelectorAll(':scope > strong[data-edit-field], :scope > p[data-edit-field]').forEach(field => {
			field.dataset.blockId = blockId;
			field.dataset.columnIndex = '0';
			field.setAttribute('contenteditable', 'true');
			if (field.querySelector('.history-row-actions')) return;
			const actions = document.createElement('span');
			actions.className = 'history-row-actions';
			actions.setAttribute('contenteditable', 'false');
			actions.innerHTML = '<button type="button" class="history-row-btn history-date-add" title="날짜 추가" aria-label="날짜 추가"><i class="ri-calendar-line" aria-hidden="true"></i></button><button type="button" class="history-row-btn history-item-add" title="내용 추가" aria-label="내용 추가"><i class="ri-add-line" aria-hidden="true"></i></button><button type="button" class="history-row-btn history-item-remove" title="항목 삭제" aria-label="항목 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
			field.appendChild(actions);
		});
		if (slide.dataset.historySlideEditorBound === 'true') return;
		slide.dataset.historySlideEditorBound = 'true';
		slide.addEventListener('click', event => {
			const dateAddBtn = event.target.closest('.history-date-add');
			const itemAddBtn = event.target.closest('.history-item-add');
			const removeBtn = event.target.closest('.history-item-remove');
			if (!dateAddBtn && !itemAddBtn && !removeBtn) return;
			event.preventDefault();
			event.stopPropagation();
			const field = event.target.closest('strong[data-edit-field], p[data-edit-field]');
			if (!field) return;
			pushHistory();
			if (dateAddBtn) {
				const dateKey = getNextHistoryListPairKey(item, 'list-date');
				const newStrong = document.createElement('strong');
				newStrong.dataset.editField = dateKey;
				newStrong.dataset.blockId = blockId;
				newStrong.dataset.columnIndex = '0';
				newStrong.setAttribute('contenteditable', 'true');
				newStrong.textContent = '02.07 - 02.08';
				item[dateKey] = newStrong.innerHTML;
				field.insertAdjacentElement('afterend', newStrong);
				decorateHistoryTypeASlideRows(histEl, blockId);
				saveHistoryTypeASlideHtml(blockId, slide);
				slide.closest('.list')?.swiper?.update();
				newStrong.focus();
				return;
			}
			if (itemAddBtn) {
				const itemKey = getNextHistoryListPairKey(item, 'list-item');
				const newP = document.createElement('p');
				newP.dataset.editField = itemKey;
				newP.dataset.blockId = blockId;
				newP.dataset.columnIndex = '0';
				newP.setAttribute('contenteditable', 'true');
				newP.textContent = '연혁 내용이 들어갑니다.';
				item[itemKey] = newP.innerHTML;
				field.insertAdjacentElement('afterend', newP);
				decorateHistoryTypeASlideRows(histEl, blockId);
				saveHistoryTypeASlideHtml(blockId, slide);
				slide.closest('.list')?.swiper?.update();
				newP.focus();
				return;
			}
			const totalFields = slide.querySelectorAll(':scope > strong[data-edit-field], :scope > p[data-edit-field]').length;
			if (totalFields > 1) {
				const focusTarget = field.nextElementSibling || field.previousElementSibling;
				delete item[field.dataset.editField];
				field.remove();
				saveHistoryTypeASlideHtml(blockId, slide);
				slide.closest('.list')?.swiper?.update();
				focusTarget?.focus();
			}
		});
		slide.addEventListener('input', event => {
			if (event.target.closest('.history-row-actions')) return;
			saveHistoryTypeASlideHtml(blockId, slide);
		});
	});
}

function addHistoryTypeAYear(blockId) {
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	if (!block || templateCategories[block.type] !== 'history') return;
	const escapedBlockId = window.CSS?.escape ? CSS.escape(blockId) : String(blockId).replace(/"/g, '\\"');
	const histEl = document.querySelector(`.builder-block[data-block-id="${escapedBlockId}"] .history.tyA`);
	pushHistory();
	const item = block.items?.[0] || (block.items = [{}])[0];
	const nextCount = Math.max(block.historyYearCount || getHistoryTypeADefaultCount(block.type), 1) + 1;
	block.historyYearCount = nextCount;
	const yearText = histEl ? getHistoryTypeANextYearLabel(histEl) : String(new Date().getFullYear());
	item[`timeline-year${nextCount}`] = yearText;
	_historyFocusRequest = { blockId, type: 'tyA', index: nextCount - 1 };
	render();
}

function decorateHistoryTypeATimelineDeleteButtons(histEl, blockId) {
	if (!histEl.classList.contains('tyA')) return;
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const defaultCount = getHistoryTypeADefaultCount(block.type);
	getHistoryTypeATimelineNodes(histEl).forEach((slide, idx) => {
		if (idx < defaultCount) return;
		slide.dataset.historyAdded = 'true';
		if (slide.querySelector('.history-tya-timeline-year-del')) return;
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'history-tya-timeline-year-del';
		btn.title = '연도 삭제';
		btn.setAttribute('aria-label', '연도 삭제');
		btn.innerHTML = '<i class="ri-close-line" aria-hidden="true"></i>';
		btn.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			removeHistoryTypeAYear(blockId, idx);
		});
		slide.appendChild(btn);
	});
}

function removeHistoryTypeAYear(blockId, slideIndex) {
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	if (!block || templateCategories[block.type] !== 'history') return;
	const item = block.items?.[0];
	if (!item) return;

	const defaultCount = getHistoryTypeADefaultCount(block.type);
	if (slideIndex < defaultCount) return;

	const escapedBlockId = window.CSS?.escape ? CSS.escape(blockId) : String(blockId).replace(/"/g, '\\"');
	const histEl = document.querySelector(`.builder-block[data-block-id="${escapedBlockId}"] .history`);
	if (!histEl) return;

	const listSlides = getHistoryTypeASlideNodes(histEl);
	const timelineSlides = getHistoryTypeATimelineNodes(histEl);
	const totalCount = listSlides.length;
	if (slideIndex >= totalCount) return;

	pushHistory();

	// 현재 모든 list 슬라이드 HTML 저장
	listSlides.forEach((slide, idx) => {
		item[`historyListSlideHtml${idx + 1}`] = cleanHistoryTypeASlideHtml(slide);
	});

	// 현재 timeline 연도 텍스트 수집
	const timelineYears = timelineSlides.map(slide =>
		slide.querySelector('button')?.textContent?.trim() || String(new Date().getFullYear())
	);

	// 삭제할 슬라이드의 data-edit-field 키 제거
	const keysToDelete = new Set();
	listSlides[slideIndex].querySelectorAll('[data-edit-field]').forEach(f => keysToDelete.add(f.dataset.editField));
	timelineSlides[slideIndex].querySelectorAll('[data-edit-field]').forEach(f => keysToDelete.add(f.dataset.editField));
	keysToDelete.forEach(k => delete item[k]);

	// historyListSlideHtml 키 앞으로 당기기
	for (let i = slideIndex; i < totalCount - 1; i++) {
		item[`historyListSlideHtml${i + 1}`] = item[`historyListSlideHtml${i + 2}`];
	}
	delete item[`historyListSlideHtml${totalCount}`];

	// timeline-year{N} 키 재구성
	for (let i = 1; i <= totalCount; i++) delete item[`timeline-year${i}`];
	timelineYears.splice(slideIndex, 1);
	timelineYears.forEach((year, idx) => { item[`timeline-year${idx + 1}`] = year; });

	block.historyYearCount = Math.max(defaultCount, totalCount - 1);
	render();
}

function addHistoryTypeACanvasControls(histEl, blockId) {
	if (!histEl.classList.contains('tyA')) return;
	if (!histEl.querySelector(':scope > .history-add-year-row')) {
		const addRow = document.createElement('div');
		addRow.className = 'pstep-add-row history-add-year-row';
		addRow.innerHTML = '<button type="button" class="pstep-add-btn history-add-year-btn"><i class="ri-add-line" aria-hidden="true"></i><span>연도 추가</span></button>';
		histEl.appendChild(addRow);
		addRow.querySelector('button')?.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			addHistoryTypeAYear(blockId);
		});
	}
	decorateHistoryTypeASlideRows(histEl, blockId);
	decorateHistoryTypeATimelineDeleteButtons(histEl, blockId);
}

function cleanHistoryManagedHtml(root) {
	const clean = root.cloneNode(true);
	clean.querySelectorAll('.history-add-year-row, .history-year-actions, .history-row-actions, .history-year-dl-actions, .history-section-year-add-row').forEach(el => el.remove());
	clean.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
	clean.querySelectorAll('[data-block-id]').forEach(el => el.removeAttribute('data-block-id'));
	clean.querySelectorAll('[data-column-index]').forEach(el => el.removeAttribute('data-column-index'));
	clean.querySelectorAll('[data-history-bound]').forEach(el => el.removeAttribute('data-history-bound'));
	clean.querySelectorAll('[data-history-tyb-bound]').forEach(el => el.removeAttribute('data-history-tyb-bound'));
	clean.querySelectorAll('[data-history-tyc-bound]').forEach(el => el.removeAttribute('data-history-tyc-bound'));
	if (clean.classList.contains('tyB')) {
		// 캔버스 스크롤스파이/클릭으로 붙는 임시 활성 상태는 저장하지 않는다.
		// (배포 페이지는 sub_com.js가 실제 스크롤 위치 기준으로 매번 다시 계산함)
		clean.querySelectorAll(':scope .history-header .year > ul > li.on').forEach(li => li.classList.remove('on'));
	}
	if (clean.classList.contains('tyC')) {
		clean.querySelectorAll(':scope .history-header .year li.on').forEach(li => li.classList.remove('on'));
		clean.querySelectorAll(':scope .list-wrap .list dl.active').forEach(dl => dl.classList.remove('active'));
	}
	return clean.innerHTML;
}

function saveHistoryManagedHtml(histEl, blockId) {
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	if (!block || templateCategories[block.type] !== 'history') return;
	const item = block.items?.[0] || (block.items = [{}])[0];
	item.historyManagedHtml = cleanHistoryManagedHtml(histEl);
	updateMarkup();
}

function applyHistoryManagedOverride(root, item) {
	if (!root?.classList?.contains('history') || root.classList.contains('tyA')) return;
	if (item?.historyManagedHtml) root.innerHTML = item.historyManagedHtml;
}

function addHistoryCanvasControls() {
	document.querySelectorAll('.builder-block').forEach(blockEl => {
		const block = state.blocks.find(b => b.id === blockEl.dataset.blockId);
		if (!block || templateCategories[block.type] !== 'history') return;
		const histEl = blockEl.querySelector('.history');
		if (!histEl || histEl.dataset.historyControlsReady === 'true') return;
		histEl.dataset.historyControlsReady = 'true';
		addHistoryTypeACanvasControls(histEl, blockEl.dataset.blockId);

		// tyA: timeline button clicks
		if (histEl.classList.contains('tyA')) {
			const listSlides = Array.from(histEl.querySelectorAll('.list .swiper-slide'));
			const timelineSlides = Array.from(histEl.querySelectorAll('.timeline .swiper-slide'));
			const yearLabel = histEl.querySelector('.year [data-edit-field]');
			const listSwiper = histEl.querySelector('.list')?.swiper;
			const timelineSwiper = getHistoryTypeATimelineSwiperEl(histEl)?.swiper;
			timelineSlides.forEach((slide, idx) => {
				const btn = slide.querySelector('button');
				if (!btn) return;
				btn.addEventListener('click', () => {
					if (listSwiper) listSwiper.slideTo(idx);
					if (timelineSwiper) timelineSwiper.slideTo(idx);
					listSlides.forEach((s, i) => s.classList.toggle('swiper-slide-active', i === idx));
					timelineSlides.forEach((s, i) => s.classList.toggle('swiper-slide-active', i === idx));
					if (yearLabel) yearLabel.textContent = btn.textContent.trim();
				});
			});
		}

		// tyB: 연도구간/연도그룹/날짜항목 CRUD + 클릭 스크롤
		if (histEl.classList.contains('tyB')) {
			decorateHistoryTypeBControls(histEl, blockEl.dataset.blockId);
		}

		// tyC: 연도구간/연도(dl)/날짜·내용(li) CRUD + 클릭 스크롤
		if (histEl.classList.contains('tyC')) {
			decorateHistoryTypeCControls(histEl, blockEl.dataset.blockId);
		}
	});
}

function focusHistoryAddedYear() {
	if (!_historyFocusRequest) return;
	const { blockId, index } = _historyFocusRequest;
	_historyFocusRequest = null;
	const escapedBlockId = window.CSS?.escape ? CSS.escape(blockId) : String(blockId).replace(/"/g, '\\"');
	const histEl = document.querySelector(`.builder-block[data-block-id="${escapedBlockId}"] .history`);
	if (!histEl) return;
	if (histEl.classList.contains('tyA')) {
		const listSwiper = histEl.querySelector(':scope .list')?.swiper;
		const timelineSwiper = getHistoryTypeATimelineSwiperEl(histEl)?.swiper;
		listSwiper?.slideTo(index, 0);
		timelineSwiper?.slideTo(index, 0);
		histEl.querySelectorAll('.list .swiper-slide').forEach((slide, i) => slide.classList.toggle('swiper-slide-active', i === index));
		histEl.querySelectorAll('.timeline .swiper-slide').forEach((slide, i) => slide.classList.toggle('swiper-slide-active', i === index));
		const yearLabel = histEl.querySelector('.year [data-edit-field]');
		const activeYear = histEl.querySelectorAll('.timeline .swiper-slide')[index]?.querySelector('button')?.textContent?.trim();
		if (yearLabel && activeYear) yearLabel.textContent = activeYear;
		histEl.querySelectorAll('.list .swiper-slide')[index]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
		return;
	}
}

/* -------------------------------------------------------------
   history-tyB (연도구간 탭 + 연도그룹/날짜항목 2단 리스트)
   구조: .history-header .year > ul > li > a[data-target] 와
         .list-wrap > .list[id] 가 data-target/id 로 1:1 매칭됨.
         이 마크업 규격은 00_common/js/sub_com.js 의 클릭 스크롤/
         스크롤스파이 스크립트가 그대로 사용하므로 배포 페이지에서는
         추가 작업 없이 동작한다. 전체 콘텐츠는 achieve-block 패턴과
         동일하게 item.historyManagedHtml 블롭 하나로 저장/복원된다.
   ------------------------------------------------------------- */
function getHistoryTypeBSections(histEl) {
	return Array.from(histEl.querySelectorAll(':scope .list-wrap > .list[id]'));
}

function getHistoryTypeBNavItems(histEl) {
	return Array.from(histEl.querySelectorAll(':scope .history-header .year > ul > li'));
}

function getHistoryTypeBNextTargetId(histEl) {
	let max = 0;
	getHistoryTypeBSections(histEl).forEach(section => {
		const num = Number(String(section.id || '').match(/^history(\d+)$/)?.[1] || 0);
		max = Math.max(max, num);
	});
	return `history${max + 1}`;
}

function guessNextHistoryYearText(text) {
	const num = Number(String(text || '').match(/\d{4}/)?.[0]);
	return String(Number.isFinite(num) && num > 0 ? num + 1 : new Date().getFullYear());
}

// 캔버스 스크롤 위치에 따라 현재 보이는 연도구간에 'on' 클래스 부여
// (배포 페이지의 sub_com.js 스크롤스파이와 동일한 개념을 빌더 캔버스 스크롤 컨테이너 기준으로 재현)
function updateHistoryTypeBActiveNav(histEl) {
	const sections = getHistoryTypeBSections(histEl);
	const navItems = getHistoryTypeBNavItems(histEl);
	if (!sections.length || !navItems.length) return;
	const scroller = histEl.closest('.canvas-wrapper');
	const containerTop = scroller ? scroller.getBoundingClientRect().top : 0;
	const OFFSET = 40;
	let currentId = sections[0].id;
	sections.forEach(section => {
		const top = section.getBoundingClientRect().top - containerTop;
		if (top <= OFFSET) currentId = section.id;
	});
	navItems.forEach(li => {
		const target = li.querySelector('a')?.dataset.target;
		li.classList.toggle('on', target === currentId);
	});
}

// .canvas-wrapper는 렌더마다 새로 만들어지지 않는 고정 컨테이너이므로,
// histEl(블록마다 매번 새로 생성됨) 기준으로 매번 바인딩하면 리스너가 계속 누적된다.
// 스크롤 리스너는 컨테이너당 한 번만 걸고, 현재 존재하는 모든 tyB 블록을 다시 조회해 갱신한다.
const _historyTybScrollBoundScrollers = new WeakSet();
function bindHistoryTypeBScrollSpy(histEl) {
	updateHistoryTypeBActiveNav(histEl);
	const scroller = histEl.closest('.canvas-wrapper') || window;
	if (_historyTybScrollBoundScrollers.has(scroller)) return;
	_historyTybScrollBoundScrollers.add(scroller);
	scroller.addEventListener('scroll', () => {
		document.querySelectorAll('.builder-block .history.tyB').forEach(updateHistoryTypeBActiveNav);
	}, { passive: true });
}

function addHistoryTypeBSection(histEl, blockId) {
	const navList = histEl.querySelector(':scope .history-header .year > ul');
	const listWrap = histEl.querySelector(':scope .list-wrap');
	if (!navList || !listWrap) return;
	pushHistory();

	const nextId = getHistoryTypeBNextTargetId(histEl);
	const navItems = getHistoryTypeBNavItems(histEl);
	const yearText = guessNextHistoryYearText(navItems[navItems.length - 1]?.querySelector('a')?.textContent);

	const navLi = document.createElement('li');
	const navLink = document.createElement('a');
	navLink.href = 'javascript:void(0);';
	navLink.dataset.target = nextId;
	navLink.textContent = yearText;
	navLi.appendChild(navLink);
	navList.appendChild(navLi);

	const section = document.createElement('div');
	section.className = 'list';
	section.id = nextId;
	section.innerHTML = `<dl><dt>${escapeHtml(yearText)}</dt><dd><ul class="history-dep01"><li><strong>${escapeHtml(yearText)}</strong><ul class="history-dep02"><li><strong>03.01.</strong>내용입니다.</li></ul></li></ul></dd></dl>`;
	listWrap.appendChild(section);

	decorateHistoryTypeBControls(histEl, blockId);
	saveHistoryManagedHtml(histEl, blockId);
	navLink.focus();
}

function removeHistoryTypeBSection(histEl, blockId, navLi) {
	const navList = navLi?.parentElement;
	if (!histEl || !navLi || !navList) return;
	if (navList.querySelectorAll(':scope > li').length <= 1) return;
	const targetId = navLi.querySelector('a')?.dataset.target;
	const escapedTargetId = window.CSS?.escape ? CSS.escape(targetId) : targetId;
	const section = targetId ? histEl.querySelector(`:scope .list-wrap > .list[id="${escapedTargetId}"]`) : null;
	pushHistory();
	const focusTarget = navLi.nextElementSibling || navLi.previousElementSibling;
	navLi.remove();
	section?.remove();
	saveHistoryManagedHtml(histEl, blockId);
	focusTarget?.querySelector('a')?.focus();
}

function addHistoryTypeBYearGroup(dep01List, blockId, histEl) {
	if (!dep01List) return;
	pushHistory();
	const lastLi = dep01List.querySelector(':scope > li:last-child');
	const yearText = guessNextHistoryYearText(lastLi?.querySelector(':scope > strong')?.textContent);
	const li = document.createElement('li');
	li.innerHTML = `<strong>${escapeHtml(yearText)}</strong><ul class="history-dep02"><li><strong>03.01.</strong>내용입니다.</li></ul>`;
	dep01List.appendChild(li);
	decorateHistoryTypeBControls(histEl, blockId);
	saveHistoryManagedHtml(histEl, blockId);
	li.querySelector(':scope > strong')?.focus();
}

function addHistoryTypeBDateItem(dep02List, blockId, histEl) {
	if (!dep02List) return;
	pushHistory();
	const li = document.createElement('li');
	li.innerHTML = '<strong>03.01.</strong>내용입니다.';
	dep02List.appendChild(li);
	decorateHistoryTypeBControls(histEl, blockId);
	saveHistoryManagedHtml(histEl, blockId);
	li.focus();
}

function removeHistoryTypeBDateItem(li, blockId, histEl) {
	const dep02List = li?.parentElement;
	if (!dep02List) return;
	if (dep02List.querySelectorAll(':scope > li').length <= 1) return;
	pushHistory();
	const focusTarget = li.nextElementSibling || li.previousElementSibling;
	li.remove();
	saveHistoryManagedHtml(histEl, blockId);
	focusTarget?.focus();
}

function decorateHistoryTypeBControls(histEl, blockId) {
	if (!histEl || !histEl.classList.contains('tyB')) return;

	// 연도구간 네비 링크: 텍스트 편집(→ 대응 dt 동기화) + 클릭 스크롤
	histEl.querySelectorAll(':scope .history-header .year > ul > li > a[data-target]').forEach(link => {
		link.setAttribute('contenteditable', 'true');
		if (link.dataset.historyTybBound === 'true') return;
		link.dataset.historyTybBound = 'true';
		link.addEventListener('click', event => {
			event.preventDefault();
			const escapedTarget = window.CSS?.escape ? CSS.escape(link.dataset.target) : link.dataset.target;
			const target = histEl.querySelector(`:scope .list-wrap > .list[id="${escapedTarget}"]`);
			getHistoryTypeBNavItems(histEl).forEach(navLi => navLi.classList.remove('on'));
			link.closest('li')?.classList.add('on');
			target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
		link.addEventListener('input', () => {
			const escapedTarget = window.CSS?.escape ? CSS.escape(link.dataset.target) : link.dataset.target;
			const section = histEl.querySelector(`:scope .list-wrap > .list[id="${escapedTarget}"]`);
			const dt = section?.querySelector(':scope > dl > dt');
			if (dt) dt.textContent = link.textContent;
			saveHistoryManagedHtml(histEl, blockId);
		});
	});

	// 연도구간(탭+섹션) 삭제 버튼 — dl 우측 상단, hover 시 노출
	histEl.querySelectorAll(':scope .list-wrap > .list[id] > dl').forEach(dl => {
		if (!dl.querySelector(':scope > .history-year-dl-actions')) {
			const actions = document.createElement('span');
			actions.className = 'history-year-dl-actions';
			actions.innerHTML = '<button type="button" class="history-year-dl-remove" title="연도구간 삭제" aria-label="연도구간 삭제"><i class="ri-close-line" aria-hidden="true"></i></button>';
			dl.appendChild(actions);
		}
		if (dl.dataset.historyTybBound === 'true') return;
		dl.dataset.historyTybBound = 'true';
		dl.querySelector(':scope > .history-year-dl-actions .history-year-dl-remove')?.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			const section = dl.closest('.list[id]');
			const escapedId = window.CSS?.escape ? CSS.escape(section?.id || '') : section?.id;
			const navLi = histEl.querySelector(`:scope .history-header .year > ul > li > a[data-target="${escapedId}"]`)?.closest('li');
			if (navLi) removeHistoryTypeBSection(histEl, blockId, navLi);
		});
	});

	// 전역 "연도구간 추가" 버튼
	if (!histEl.querySelector(':scope > .history-add-year-row')) {
		const addRow = document.createElement('div');
		addRow.className = 'pstep-add-row history-add-year-row';
		addRow.innerHTML = '<button type="button" class="pstep-add-btn history-add-year-btn"><i class="ri-add-line" aria-hidden="true"></i><span>연도구간 추가</span></button>';
		histEl.appendChild(addRow);
		addRow.querySelector('button')?.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			addHistoryTypeBSection(histEl, blockId);
		});
	}

	// 연도그룹(dep01): 연도 텍스트 편집
	histEl.querySelectorAll(':scope .history-dep01 > li').forEach(li => {
		const strong = li.querySelector(':scope > strong');
		if (strong) strong.setAttribute('contenteditable', 'true');
		if (li.dataset.historyTybBound !== 'true') {
			li.dataset.historyTybBound = 'true';
			strong?.addEventListener('input', () => saveHistoryManagedHtml(histEl, blockId));
		}
	});

	// 연도그룹 목록 하단 "연도 추가" 버튼 (요구사항: 내용 추가 버튼)
	histEl.querySelectorAll(':scope .history-dep01').forEach(dep01 => {
		const next = dep01.nextElementSibling;
		if (!next || !next.classList.contains('history-section-year-add-row')) {
			const row = document.createElement('div');
			row.className = 'history-section-year-add-row';
			row.innerHTML = '<button type="button" class="history-section-year-add"><i class="ri-add-line" aria-hidden="true"></i><span>연도 추가</span></button>';
			dep01.insertAdjacentElement('afterend', row);
			row.querySelector('button')?.addEventListener('click', event => {
				event.preventDefault();
				event.stopPropagation();
				addHistoryTypeBYearGroup(dep01, blockId, histEl);
			});
		}
	});

	// 날짜항목(dep02): 텍스트 편집 + 항목 추가/삭제
	histEl.querySelectorAll(':scope .history-dep02 > li').forEach(li => {
		li.setAttribute('contenteditable', 'true');
		if (!li.querySelector(':scope > .history-row-actions')) {
			const actions = document.createElement('span');
			actions.className = 'history-row-actions';
			actions.setAttribute('contenteditable', 'false');
			actions.innerHTML = '<button type="button" class="history-row-btn history-item-add" title="날짜 항목 추가" aria-label="날짜 항목 추가"><i class="ri-add-line" aria-hidden="true"></i></button><button type="button" class="history-row-btn history-item-remove" title="날짜 항목 삭제" aria-label="날짜 항목 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
			li.appendChild(actions);
		}
		if (li.dataset.historyTybBound === 'true') return;
		li.dataset.historyTybBound = 'true';
		li.addEventListener('click', event => {
			const addBtn = event.target.closest('.history-item-add');
			const removeBtn = event.target.closest('.history-item-remove');
			if (!addBtn && !removeBtn) return;
			event.preventDefault();
			event.stopPropagation();
			if (addBtn) { addHistoryTypeBDateItem(li.parentElement, blockId, histEl); return; }
			removeHistoryTypeBDateItem(li, blockId, histEl);
		});
		li.addEventListener('input', event => {
			if (event.target.closest('.history-row-actions')) return;
			saveHistoryManagedHtml(histEl, blockId);
		});
	});

	bindHistoryTypeBScrollSpy(histEl);
	updateHistoryTypeBActiveNav(histEl);
}

/* -------------------------------------------------------------
   history-tyC (연도구간 탭 + 연도(dl) + 날짜/내용(li) 3단 리스트)
   구조: .history-header .year 안의 a[data-target] 와
         .list-wrap > .list[id] 가 data-target/id 로 1:1 매칭되고,
         한 섹션(.list[id]) 안에 여러 개의 <dl>(연도)이 올 수 있다.
         이 마크업 규격과 dl.active 진입 효과는 00_common/js/sub_com.js
         스크립트가 그대로 사용하므로 배포 페이지에서는 추가 작업 없이 동작한다.
   ------------------------------------------------------------- */
function getHistoryTypeCSections(histEl) {
	return Array.from(histEl.querySelectorAll(':scope .list-wrap > .list[id]'));
}

function getHistoryTypeCNavItems(histEl) {
	return Array.from(histEl.querySelectorAll(':scope .history-header .year li'));
}

function getHistoryTypeCNextTargetId(histEl) {
	let max = 0;
	getHistoryTypeCSections(histEl).forEach(section => {
		const num = Number(String(section.id || '').match(/^history(\d+)$/)?.[1] || 0);
		max = Math.max(max, num);
	});
	return `history${max + 1}`;
}

function addHistoryTypeCSection(histEl, blockId) {
	const navList = histEl.querySelector(':scope .history-header .year ul');
	const listWrap = histEl.querySelector(':scope .list-wrap');
	if (!navList || !listWrap) return;
	pushHistory();

	const nextId = getHistoryTypeCNextTargetId(histEl);
	const navLi = document.createElement('li');
	const navLink = document.createElement('a');
	navLink.href = 'javascript:void(0);';
	navLink.dataset.target = nextId;
	navLink.textContent = '새 연도구간';
	navLi.appendChild(navLink);
	navList.appendChild(navLi);

	const lastDt = Array.from(histEl.querySelectorAll(':scope .list-wrap .list dl > dt')).pop();
	const yearText = guessNextHistoryYearText(lastDt?.textContent);

	const section = document.createElement('div');
	section.className = 'list';
	section.id = nextId;
	section.innerHTML = `<dl><dt>${escapeHtml(yearText)}</dt><dd><ul><li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용을 입력하세요.</p></div></li></ul></dd></dl>`;
	listWrap.appendChild(section);

	decorateHistoryTypeCControls(histEl, blockId);
	saveHistoryManagedHtml(histEl, blockId);
	navLink.focus();
}

function removeHistoryTypeCSection(histEl, blockId, navLi) {
	const navList = navLi?.parentElement;
	if (!histEl || !navLi || !navList) return;
	if (navList.querySelectorAll(':scope > li').length <= 1) return;
	const targetId = navLi.querySelector('a')?.dataset.target;
	const escapedTargetId = window.CSS?.escape ? CSS.escape(targetId) : targetId;
	const section = targetId ? histEl.querySelector(`:scope .list-wrap > .list[id="${escapedTargetId}"]`) : null;
	pushHistory();
	const focusTarget = navLi.nextElementSibling || navLi.previousElementSibling;
	navLi.remove();
	section?.remove();
	saveHistoryManagedHtml(histEl, blockId);
	focusTarget?.querySelector('a')?.focus();
}

function addHistoryTypeCYearGroup(section, blockId, histEl) {
	if (!section) return;
	pushHistory();
	const lastDl = section.querySelector(':scope > dl:last-of-type');
	const yearText = guessNextHistoryYearText(lastDl?.querySelector(':scope > dt')?.textContent);
	const dl = document.createElement('dl');
	dl.innerHTML = `<dt>${escapeHtml(yearText)}</dt><dd><ul><li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용을 입력하세요.</p></div></li></ul></dd>`;
	section.appendChild(dl);
	decorateHistoryTypeCControls(histEl, blockId);
	saveHistoryManagedHtml(histEl, blockId);
	dl.querySelector(':scope > dt')?.focus();
}

function addHistoryTypeCDateItem(ul, blockId, histEl) {
	if (!ul) return;
	pushHistory();
	const li = document.createElement('li');
	li.innerHTML = '<strong>08.20</strong><div class="inr"><p>학교 연혁 내용을 입력하세요.</p></div>';
	ul.appendChild(li);
	decorateHistoryTypeCControls(histEl, blockId);
	saveHistoryManagedHtml(histEl, blockId);
	li.querySelector(':scope > strong')?.focus();
}

function removeHistoryTypeCDateItem(li, blockId, histEl) {
	const ul = li?.parentElement;
	if (!ul) return;
	if (ul.querySelectorAll(':scope > li').length <= 1) return;
	pushHistory();
	const focusTarget = li.nextElementSibling || li.previousElementSibling;
	li.remove();
	saveHistoryManagedHtml(histEl, blockId);
	focusTarget?.querySelector(':scope > strong')?.focus();
}

function updateHistoryTypeCActiveNav(histEl) {
	const sections = getHistoryTypeCSections(histEl);
	const navItems = getHistoryTypeCNavItems(histEl);
	if (!sections.length || !navItems.length) return;
	const scroller = histEl.closest('.canvas-wrapper');
	const containerTop = scroller ? scroller.getBoundingClientRect().top : 0;
	const OFFSET = 40;
	let currentId = sections[0].id;
	sections.forEach(section => {
		const top = section.getBoundingClientRect().top - containerTop;
		if (top <= OFFSET) currentId = section.id;
	});
	navItems.forEach(li => {
		const target = li.querySelector('a')?.dataset.target;
		li.classList.toggle('on', target === currentId);
	});
}

function updateHistoryTypeCActiveDl(histEl) {
	const dls = Array.from(histEl.querySelectorAll(':scope .list-wrap .list dl'));
	if (!dls.length) return;
	const scroller = histEl.closest('.canvas-wrapper');
	const containerTop = scroller ? scroller.getBoundingClientRect().top : 0;
	const OFFSET = 40;
	dls.forEach(dl => {
		const top = dl.getBoundingClientRect().top - containerTop;
		dl.classList.toggle('active', top <= OFFSET);
	});
}

const _historyTycScrollBoundScrollers = new WeakSet();
function bindHistoryTypeCScrollSpy(histEl) {
	updateHistoryTypeCActiveNav(histEl);
	updateHistoryTypeCActiveDl(histEl);
	const scroller = histEl.closest('.canvas-wrapper') || window;
	if (_historyTycScrollBoundScrollers.has(scroller)) return;
	_historyTycScrollBoundScrollers.add(scroller);
	scroller.addEventListener('scroll', () => {
		document.querySelectorAll('.builder-block .history.tyC').forEach(el => {
			updateHistoryTypeCActiveNav(el);
			updateHistoryTypeCActiveDl(el);
		});
	}, { passive: true });
}

function decorateHistoryTypeCControls(histEl, blockId) {
	if (!histEl || !histEl.classList.contains('tyC')) return;

	// 헤딩(History) 텍스트 편집
	const headingSpan = histEl.querySelector(':scope .history-header h4 span');
	if (headingSpan) {
		headingSpan.setAttribute('contenteditable', 'true');
		if (headingSpan.dataset.historyTycBound !== 'true') {
			headingSpan.dataset.historyTycBound = 'true';
			headingSpan.addEventListener('input', () => saveHistoryManagedHtml(histEl, blockId));
		}
	}

	// 연도구간 탭: 텍스트 편집 + 클릭 스크롤
	histEl.querySelectorAll(':scope .history-header .year a[data-target]').forEach(link => {
		link.setAttribute('contenteditable', 'true');
		if (link.dataset.historyTycBound === 'true') return;
		link.dataset.historyTycBound = 'true';
		link.addEventListener('click', event => {
			event.preventDefault();
			const escapedTarget = window.CSS?.escape ? CSS.escape(link.dataset.target) : link.dataset.target;
			const target = histEl.querySelector(`:scope .list-wrap > .list[id="${escapedTarget}"]`);
			getHistoryTypeCNavItems(histEl).forEach(navLi => navLi.classList.remove('on'));
			link.closest('li')?.classList.add('on');
			target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
		link.addEventListener('input', () => saveHistoryManagedHtml(histEl, blockId));
	});

	// 연도구간(탭+섹션) 삭제 버튼 — 섹션 우측 상단, hover 시 노출
	histEl.querySelectorAll(':scope .list-wrap > .list[id]').forEach(section => {
		if (!section.querySelector(':scope > .history-year-dl-actions')) {
			const actions = document.createElement('span');
			actions.className = 'history-year-dl-actions';
			actions.innerHTML = '<button type="button" class="history-year-dl-remove" title="연도구간 삭제" aria-label="연도구간 삭제"><i class="ri-close-line" aria-hidden="true"></i></button>';
			section.appendChild(actions);
		}
		if (section.dataset.historyTycBound === 'true') return;
		section.dataset.historyTycBound = 'true';
		section.querySelector(':scope > .history-year-dl-actions .history-year-dl-remove')?.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			const escapedId = window.CSS?.escape ? CSS.escape(section.id || '') : section.id;
			const navLi = histEl.querySelector(`:scope .history-header .year a[data-target="${escapedId}"]`)?.closest('li');
			if (navLi) removeHistoryTypeCSection(histEl, blockId, navLi);
		});
	});

	// 전역 "연도구간 추가" 버튼
	if (!histEl.querySelector(':scope > .history-add-year-row')) {
		const addRow = document.createElement('div');
		addRow.className = 'pstep-add-row history-add-year-row';
		addRow.innerHTML = '<button type="button" class="pstep-add-btn history-add-year-btn"><i class="ri-add-line" aria-hidden="true"></i><span>연도구간 추가</span></button>';
		histEl.appendChild(addRow);
		addRow.querySelector('button')?.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			addHistoryTypeCSection(histEl, blockId);
		});
	}

	// 연도(dl): dt 편집
	histEl.querySelectorAll(':scope .list-wrap .list dl').forEach(dl => {
		const dt = dl.querySelector(':scope > dt');
		if (dt) dt.setAttribute('contenteditable', 'true');
		if (dl.dataset.historyTycBound !== 'true') {
			dl.dataset.historyTycBound = 'true';
			dt?.addEventListener('input', () => saveHistoryManagedHtml(histEl, blockId));
		}
	});

	// 연도(dl) 목록 하단 "연도 추가" 버튼
	// dl들이 (tyB의 history-dep01 ul과 달리) 감싸는 컨테이너 없이 섹션의 직계 형제로
	// 나열되므로, 새 dl이 추가될 때마다 이전에 붙여둔 버튼 행이 중간에 끼는 것을
	// 막기 위해 매번 지우고 실제 마지막 dl 뒤에 다시 붙인다.
	histEl.querySelectorAll(':scope .list-wrap > .list[id]').forEach(section => {
		section.querySelectorAll(':scope > .history-section-year-add-row').forEach(el => el.remove());
		const lastDl = section.querySelector(':scope > dl:last-of-type');
		if (!lastDl) return;
		const row = document.createElement('div');
		row.className = 'history-section-year-add-row';
		row.innerHTML = '<button type="button" class="history-section-year-add"><i class="ri-add-line" aria-hidden="true"></i><span>연도 추가</span></button>';
		lastDl.insertAdjacentElement('afterend', row);
		row.querySelector('button')?.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			addHistoryTypeCYearGroup(section, blockId, histEl);
		});
	});

	// 날짜/내용(li): 편집 + 항목 추가/삭제
	histEl.querySelectorAll(':scope .list-wrap .list dl dd ul > li').forEach(li => {
		const strong = li.querySelector(':scope > strong');
		const contentP = li.querySelector(':scope > .inr > p');
		if (strong) strong.setAttribute('contenteditable', 'true');
		if (contentP) contentP.setAttribute('contenteditable', 'true');
		if (!li.querySelector(':scope > .history-row-actions')) {
			const actions = document.createElement('span');
			actions.className = 'history-row-actions';
			actions.innerHTML = '<button type="button" class="history-row-btn history-item-add" title="항목 추가" aria-label="항목 추가"><i class="ri-add-line" aria-hidden="true"></i></button><button type="button" class="history-row-btn history-item-remove" title="항목 삭제" aria-label="항목 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>';
			li.appendChild(actions);
		}
		if (li.dataset.historyTycBound === 'true') return;
		li.dataset.historyTycBound = 'true';
		li.addEventListener('click', event => {
			const addBtn = event.target.closest('.history-item-add');
			const removeBtn = event.target.closest('.history-item-remove');
			if (!addBtn && !removeBtn) return;
			event.preventDefault();
			event.stopPropagation();
			if (addBtn) { addHistoryTypeCDateItem(li.parentElement, blockId, histEl); return; }
			removeHistoryTypeCDateItem(li, blockId, histEl);
		});
		li.addEventListener('input', event => {
			if (event.target.closest('.history-row-actions')) return;
			saveHistoryManagedHtml(histEl, blockId);
		});
	});

	bindHistoryTypeCScrollSpy(histEl);
}

function ensureSwiperWrapper(container) {
	if (!container || container.querySelector(':scope > .swiper-wrapper')) return;
	const slides = Array.from(container.querySelectorAll(':scope > .swiper-slide'));
	if (!slides.length) return;
	const wrapper = document.createElement('div');
	wrapper.className = 'swiper-wrapper';
	slides.forEach(slide => wrapper.appendChild(slide));
	container.appendChild(wrapper);
}

function getHistoryTypeATimelineSwiperEl(histEl) {
	if (!histEl) return null;
	return histEl.querySelector(':scope .timeline > .swiper') || histEl.querySelector(':scope .timeline');
}

function initHistoryCanvasSliders() {
	document.querySelectorAll('.builder-block .history.tyA').forEach(histEl => {
		const listEl = histEl.querySelector(':scope .list');
		const timelineEl = getHistoryTypeATimelineSwiperEl(histEl);
		if (!listEl || !timelineEl) return;
		listEl.classList.add('swiper');
		timelineEl.classList.add('swiper');
		ensureSwiperWrapper(listEl);
		ensureSwiperWrapper(timelineEl);

		const updateYearLabel = index => {
			const timelineSlides = Array.from(histEl.querySelectorAll('.timeline .swiper-slide'));
			const yearLabel = histEl.querySelector('.year [data-edit-field]');
			const year = timelineSlides[index]?.querySelector('button')?.textContent?.trim();
			if (yearLabel && year) yearLabel.textContent = year;
		};

		if (typeof Swiper === 'undefined') {
			histEl.querySelectorAll('.list .swiper-slide').forEach((s, i) => s.classList.toggle('swiper-slide-active', i === 0));
			histEl.querySelectorAll('.timeline .swiper-slide').forEach((s, i) => s.classList.toggle('swiper-slide-active', i === 0));
			updateYearLabel(0);
			return;
		}

		if (!listEl.swiper) {
			new Swiper(listEl, {
				slidesPerView: 1,
				centeredSlides: false,
				speed: 600,
				loop: false,
				observer: true,
				observeParents: true,
				allowTouchMove: false
			});
			listEl.swiper.on('slideChange', () => updateYearLabel(listEl.swiper.activeIndex));
		}

		if (!timelineEl.swiper) {
			new Swiper(timelineEl, {
				slidesPerView: 5,
				centeredSlides: true,
				slideToClickedSlide: true,
				speed: 600,
				loop: false,
				observer: true,
				observeParents: true,
				allowTouchMove: false
			});
			timelineEl.swiper.on('slideChange', () => updateYearLabel(timelineEl.swiper.activeIndex));
		}

		// 양방향 연동 (sub_com.js 의 controller.control 방식과 동일)
		if (listEl.swiper && timelineEl.swiper) {
			try {
				listEl.swiper.controller.control = timelineEl.swiper;
				timelineEl.swiper.controller.control = listEl.swiper;
			} catch (_) {
				// Controller 모듈 미포함 시 이벤트 기반 폴백
				listEl.swiper.on('slideChange', () => {
					if (timelineEl.swiper && timelineEl.swiper.activeIndex !== listEl.swiper.activeIndex) timelineEl.swiper.slideTo(listEl.swiper.activeIndex);
				});
				timelineEl.swiper.on('slideChange', () => {
					if (listEl.swiper && listEl.swiper.activeIndex !== timelineEl.swiper.activeIndex) listEl.swiper.slideTo(timelineEl.swiper.activeIndex);
				});
			}
		}

		updateYearLabel(listEl.swiper?.activeIndex || 0);

		// 휠 스크롤로 슬라이드 전환 — 중복 바인딩 방지
		if (!histEl.dataset.wheelBound) {
			histEl.dataset.wheelBound = 'true';
			histEl.addEventListener('wheel', event => {
				event.preventDefault();
				if (event.deltaY > 0) {
					listEl.swiper?.slideNext();
				} else if (event.deltaY < 0) {
					listEl.swiper?.slidePrev();
				}
			}, { passive: false });
		}
	});
}

function normalizePrincipalTermElement(termEl) {
	if (!termEl || termEl.dataset.termNormalized === 'true') return;
	const strong = termEl.querySelector(':scope > strong');
	const fragments = [];
	Array.from(termEl.childNodes).forEach(node => {
		if (node === strong) return;
		if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('principal-term-line')) return;
		if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('principal-term-actions')) return;
		const html = node.nodeType === Node.TEXT_NODE ? node.textContent.trim() : node.outerHTML;
		if (html) fragments.push(html);
		node.remove();
	});
	if (!termEl.querySelector(':scope > .principal-term-line')) {
		const line = document.createElement('span');
		line.className = 'principal-term-line';
		line.innerHTML = fragments.join(' ').trim() || '2023.03.01. ~ 현재';
		termEl.appendChild(line);
	}
	termEl.dataset.termNormalized = 'true';
}

function cleanPrincipalTermHtml(termEl) {
	const clean = termEl.cloneNode(true);
	clean.querySelectorAll('.principal-term-actions').forEach(el => el.remove());
	clean.removeAttribute('data-term-normalized');
	return clean.innerHTML;
}

function savePrincipalTermValue(termEl, blockId) {
	const fieldName = termEl?.dataset.editField;
	if (!fieldName) return;
	const targetItems = getEditTargetItems(blockId);
	if (!targetItems?.[0]) return;
	targetItems[0][fieldName] = cleanPrincipalTermHtml(termEl);
	updateMarkup();
}

function decoratePrincipalTermEditors(root, blockId) {
	root.querySelectorAll('.term[data-edit-field]').forEach(termEl => {
		if (termEl.querySelector('.principal-term-actions')) return;
		normalizePrincipalTermElement(termEl);
		termEl.querySelectorAll(':scope > .principal-term-line').forEach(line => line.setAttribute('contenteditable', 'true'));
		const actions = document.createElement('span');
		actions.className = 'principal-term-actions';
		actions.innerHTML = `
			<button type="button" class="principal-term-btn principal-term-add" title="재임기간 추가" aria-label="재임기간 추가"><i class="ri-add-line" aria-hidden="true"></i></button>
			<button type="button" class="principal-term-btn principal-term-remove" title="재임기간 삭제" aria-label="재임기간 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>`;
		termEl.appendChild(actions);
		termEl.addEventListener('click', event => {
			const addBtn = event.target.closest('.principal-term-add');
			const removeBtn = event.target.closest('.principal-term-remove');
			if (!addBtn && !removeBtn) return;
			event.preventDefault();
			event.stopPropagation();
			pushHistory();
			if (addBtn) {
				const line = document.createElement('span');
				line.className = 'principal-term-line';
				line.setAttribute('contenteditable', 'true');
				line.textContent = '2023.03.01. ~ 현재';
				actions.insertAdjacentElement('beforebegin', line);
				savePrincipalTermValue(termEl, blockId);
				line.focus();
				return;
			}
			const lines = Array.from(termEl.querySelectorAll(':scope > .principal-term-line'));
			if (lines.length > 1) {
				const focusTarget = lines[lines.length - 2];
				lines[lines.length - 1].remove();
				savePrincipalTermValue(termEl, blockId);
				focusTarget?.focus();
			}
		});
		termEl.addEventListener('input', () => savePrincipalTermValue(termEl, blockId));
	});
}

function getBuilderSysId() {
	return new URLSearchParams(window.location.search).get('sysId') || window.KLIC_SYS_ID || '';
}

function fileToDataUrl(file) {
	return new Promise(resolve => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.readAsDataURL(file);
	});
}

async function uploadPrincipalImageFile(file) {
	const fallback = () => fileToDataUrl(file);
	try {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('sysId', getBuilderSysId());
		const response = await fetch('/common/editer/fileUpload.do', {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		});
		if (!response.ok) return fallback();
		const json = await response.json();
		const path = json.fileStreCours || json.url || json.fileUrl || '';
		if (path) return path.startsWith('/') ? path : `/${path}`;
		return fallback();
	} catch (error) {
		return fallback();
	}
}

function decoratePrincipalImageUploaders(root, blockId) {
	// principal-tyB/tyC-img, symbol-ty*(A~E)는 콘텐츠 파일 관리에서 바로
	// 선택하도록 한다. 그 외(principal-tyA-list의 목록 썸네일 등 이 함수를
	// 함께 쓰는 다른 타입)는 기존 로컬 업로드 방식을 그대로 유지한다.
	const block = resolveEditableBlockData(blockId) || state.blocks.find(b => b.id === blockId);
	const useCntntsFileManager = block?.type === 'principal-tyB' || block?.type === 'principal-tyC-img' || /^symbol-ty/.test(block?.type || '');

	const applySelectedImage = (imgWrap, fieldName, src, fallbackAlt) => {
		const targetItems = getEditTargetItems(blockId);
		if (!fieldName || !targetItems?.[0]) return;
		const savedIndex = root.closest('.builder-block')?.querySelector('.priHisSwiper')?.swiper?.activeIndex ?? 0;
		pushHistory();
		const alt = imgWrap.querySelector('img')?.getAttribute('alt') || fallbackAlt || '';
		targetItems[0][fieldName] = `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">`;
		render();
		if (savedIndex > 0) {
			const eid = window.CSS?.escape ? CSS.escape(blockId) : blockId;
			const newSwiper = document.querySelector(`.builder-block[data-block-id="${eid}"]`)?.querySelector('.priHisSwiper')?.swiper;
			if (newSwiper) newSwiper.slideTo(savedIndex, 0);
		}
	};

	root.querySelectorAll('.img[data-edit-field], .rsp_img[data-edit-field]').forEach(imgWrap => {
		if (imgWrap.dataset.principalUploadReady === 'true') return;
		imgWrap.dataset.principalUploadReady = 'true';
		imgWrap.setAttribute('role', 'button');
		imgWrap.setAttribute('tabindex', '0');

		if (useCntntsFileManager) {
			// 클릭→팝업 열기→img src 반영은 공용 모듈(id="imgFileUpOpen*")에 맡기고,
			// 여기서는 반영 완료 후 오는 'imgFileUpApplied' 이벤트를 받아 이 블록의
			// state에 저장하는 부분만 담당한다. 한 페이지에 여러 항목이 있으므로
			// blockId+필드명으로 id를 유일하게 만든다.
			imgWrap.title = '이미지 클릭 후 콘텐츠 파일에서 선택';
			imgWrap.id = 'imgFileUpOpen_' + blockId + '_' + imgWrap.dataset.editField;
			imgWrap.addEventListener('imgFileUpApplied', event => {
				applySelectedImage(imgWrap, imgWrap.dataset.editField, event.detail.fileSrc, event.detail.fileName);
			});
			return;
		}

		imgWrap.title = '이미지 클릭 후 사진 업로드';
		const openPicker = () => {
			const fileInput = document.createElement('input');
			fileInput.type = 'file';
			fileInput.accept = 'image/*';
			fileInput.style.position = 'fixed';
			fileInput.style.left = '-9999px';
			document.body.appendChild(fileInput);
			fileInput.addEventListener('change', async () => {
				const file = fileInput.files?.[0];
				fileInput.remove();
				if (!file || !file.type.startsWith('image/')) return;
				const src = await uploadPrincipalImageFile(file);
				applySelectedImage(imgWrap, imgWrap.dataset.editField, src);
			}, { once: true });
			fileInput.click();
		};
		imgWrap.addEventListener('click', event => {
			if (event.target.closest('.principal-bio-edit-btn, .principal-term-actions')) return;
			event.preventDefault();
			event.stopPropagation();
			openPicker();
		});
		imgWrap.addEventListener('keydown', event => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			openPicker();
		});
	});

	if (useCntntsFileManager) CntntsFileManager.wireImgTriggers(root);
}

function decoratePopupPreviewImageUploaders(preview) {
	preview.querySelectorAll('.img[data-edit-field]').forEach(imgWrap => {
		if (imgWrap.dataset.principalUploadReady === 'true') return;
		imgWrap.dataset.principalUploadReady = 'true';
		imgWrap.title = '이미지 클릭 후 사진 업로드';
		imgWrap.setAttribute('role', 'button');
		imgWrap.setAttribute('tabindex', '0');
		const openPicker = () => {
			const fileInput = document.createElement('input');
			fileInput.type = 'file';
			fileInput.accept = 'image/*';
			fileInput.style.position = 'fixed';
			fileInput.style.left = '-9999px';
			document.body.appendChild(fileInput);
			fileInput.addEventListener('change', async () => {
				const file = fileInput.files?.[0];
				fileInput.remove();
				if (!file || !file.type.startsWith('image/')) return;
				const src = await uploadPrincipalImageFile(file);
				const img = imgWrap.querySelector('img');
				if (img) {
					img.src = src;
				} else {
					imgWrap.innerHTML = `<img src="${escapeAttr(src)}" alt="">`;
				}
			}, { once: true });
			fileInput.click();
		};
		imgWrap.addEventListener('click', event => {
			event.preventDefault();
			event.stopPropagation();
			openPicker();
		});
		imgWrap.addEventListener('keydown', event => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			openPicker();
		});
	});
}

function decoratePrincipalBioListRows(preview) {
	preview.querySelectorAll('.list-wrap ul, dl.his dd ul').forEach(ul => {
		ul.querySelectorAll(':scope > li').forEach(li => {
			li.querySelector('.principal-bio-row-actions')?.remove();
			li.querySelectorAll(':scope > strong, :scope > p, :scope > .inr > p').forEach(el => el.setAttribute('contenteditable', 'true'));
			const actions = document.createElement('span');
			actions.className = 'principal-bio-row-actions';
			actions.innerHTML = `
				<button type="button" class="principal-bio-row-btn principal-bio-row-add" title="아래 행 추가" aria-label="아래 행 추가"><i class="ri-add-line" aria-hidden="true"></i></button>
				<button type="button" class="principal-bio-row-btn principal-bio-row-remove" title="행 삭제" aria-label="행 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>`;
			li.appendChild(actions);
		});
	});
}

function bindPrincipalBioListEditor(preview) {
	preview.addEventListener('click', event => {
		const addBtn = event.target.closest('.principal-bio-row-add');
		const removeBtn = event.target.closest('.principal-bio-row-remove');
		if (!addBtn && !removeBtn) return;
		event.preventDefault();
		event.stopPropagation();
		const li = event.target.closest('li');
		const ul = li?.parentElement;
		if (!li || !ul) return;
		if (addBtn) {
			const clone = li.cloneNode(true);
			clone.querySelector('.principal-bio-row-actions')?.remove();
			const year = clone.querySelector(':scope > strong');
			const text = clone.querySelector(':scope > p, :scope > .inr > p');
			if (year) year.textContent = '연도';
			if (text) text.textContent = '내용을 입력하세요.';
			li.insertAdjacentElement('afterend', clone);
			decoratePrincipalBioListRows(preview);
			clone.querySelector(':scope > strong, :scope > p, :scope > .inr > p')?.focus();
			return;
		}
		if (ul.querySelectorAll(':scope > li').length > 1) {
			const focusTarget = li.nextElementSibling || li.previousElementSibling;
			li.remove();
			decoratePrincipalBioListRows(preview);
			focusTarget?.querySelector(':scope > strong, :scope > p, :scope > .inr > p')?.focus();
		}
	});
}

function decoratePrincipalBioTermEditors(preview) {
	preview.querySelectorAll('.term').forEach(termEl => {
		if (termEl.querySelector('.principal-term-actions')) return;
		normalizePrincipalTermElement(termEl);
		termEl.querySelectorAll(':scope > .principal-term-line').forEach(line => line.setAttribute('contenteditable', 'true'));
		const actions = document.createElement('span');
		actions.className = 'principal-term-actions';
		actions.innerHTML = `
			<button type="button" class="principal-term-btn principal-term-add" title="재임기간 추가" aria-label="재임기간 추가"><i class="ri-add-line" aria-hidden="true"></i></button>
			<button type="button" class="principal-term-btn principal-term-remove" title="재임기간 삭제" aria-label="재임기간 삭제"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>`;
		termEl.appendChild(actions);
	});
	preview.addEventListener('click', event => {
		const addBtn = event.target.closest('.principal-term-add');
		const removeBtn = event.target.closest('.principal-term-remove');
		if (!addBtn && !removeBtn) return;
		event.preventDefault();
		event.stopPropagation();
		const termEl = event.target.closest('.term');
		const actions = termEl?.querySelector(':scope > .principal-term-actions');
		if (!termEl || !actions) return;
		if (addBtn) {
			const line = document.createElement('span');
			line.className = 'principal-term-line';
			line.setAttribute('contenteditable', 'true');
			line.textContent = '2023.03.01. ~ 현재';
			actions.insertAdjacentElement('beforebegin', line);
			line.focus();
			return;
		}
		const lines = Array.from(termEl.querySelectorAll(':scope > .principal-term-line'));
		if (lines.length > 1) {
			const focusTarget = lines[lines.length - 2];
			lines[lines.length - 1].remove();
			focusTarget?.focus();
		}
	});
}

function getCleanPrincipalBioHtml(preview) {
	const clean = preview.cloneNode(true);
	clean.classList.remove('principal-bio-editor-preview');
	clean.querySelectorAll('.principal-bio-row-actions').forEach(el => el.remove());
	clean.querySelectorAll('.principal-term-actions').forEach(el => el.remove());
	clean.querySelectorAll('.principal-tyb-year-actions, .principal-tyb-content-actions').forEach(el => el.remove());
	clean.querySelectorAll('[data-term-normalized]').forEach(el => el.removeAttribute('data-term-normalized'));
	clean.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
	clean.querySelectorAll('[data-block-id]').forEach(el => el.removeAttribute('data-block-id'));
	clean.querySelectorAll('[data-column-index]').forEach(el => el.removeAttribute('data-column-index'));
	clean.querySelectorAll('details[open]').forEach(el => el.removeAttribute('open'));
	return clean.innerHTML;
}

function openPrincipalBioEditor(blockId, itemIndex) {
	const escapedBlockId = window.CSS?.escape ? CSS.escape(blockId) : String(blockId).replace(/"/g, '\\"');
	const blockEl = document.querySelector(`.builder-block[data-block-id="${escapedBlockId}"]`);
	const itemEl = getPrincipalItemNodes(blockEl?.querySelector('.pri-his'))[itemIndex];
	preparePrincipalBioSource(itemEl);
	const popup = getPrincipalBioPopup(itemEl);
	if (!popup) return;
	document.getElementById('principalBioEditorLayer')?.remove();
	const layer = document.createElement('div');
	layer.id = 'principalBioEditorLayer';
	layer.className = 'principal-bio-editor-layer';
	const editorTitle = isPrincipalDetailBio(itemEl) ? '상세 약력 편집' : '약력팝업 내용편집';
	const preview = popup.cloneNode(true);
	preview.classList.add('principal-bio-editor-preview');
	preview.querySelectorAll('details').forEach(details => { details.open = true; });
	preview.querySelectorAll('[data-edit-field]:not(.img):not(.term):not(dd), .list-wrap li > strong, .list-wrap li > p, dl.pri dt, dl.pri dd strong, dl.pri dd p, dl.his dt, dl.his dd li > strong, dl.his dd li .inr > p').forEach(field => {
		field.setAttribute('contenteditable', 'true');
		field.dataset.blockId = blockId;
		field.dataset.columnIndex = '0';
	});
	decoratePrincipalBioListRows(preview);
	bindPrincipalBioListEditor(preview);
	decoratePrincipalBioTermEditors(preview);
	decoratePopupPreviewImageUploaders(preview);
	layer.innerHTML = `
		<div class="principal-bio-editor-backdrop" data-principal-bio-close></div>
		<div class="principal-bio-editor-dialog" role="dialog" aria-modal="true" aria-label="${editorTitle}">
			<div class="principal-bio-editor-head">
				<strong>${editorTitle}</strong>
				<button type="button" class="principal-bio-editor-close" data-principal-bio-close aria-label="닫기"><i class="ri-close-line" aria-hidden="true"></i></button>
			</div>
			<div class="principal-bio-editor-body"></div>
			<div class="principal-bio-editor-actions">
				<button type="button" class="ghost-button" data-principal-bio-close>취소</button>
				<button type="button" class="primary-button" data-principal-bio-save>저장</button>
			</div>
		</div>`;
	layer.querySelector('.principal-bio-editor-body').appendChild(preview);
	const close = () => layer.remove();
	layer.querySelectorAll('[data-principal-bio-close]').forEach(btn => btn.addEventListener('click', close));
	layer.querySelector('[data-principal-bio-save]')?.addEventListener('click', () => {
		const targetItems = getEditTargetItems(blockId);
		if (!targetItems?.[0]) return close();
		pushHistory();
		preview.querySelectorAll('[data-edit-field]').forEach(field => {
			targetItems[0][field.dataset.editField] = field.innerHTML;
		});
		targetItems[0][getPrincipalBioHtmlKey(itemIndex)] = getCleanPrincipalBioHtml(preview);
		close();
		render();
	});
	document.body.appendChild(layer);
	preview.querySelector('[contenteditable="true"]')?.focus();
}

function initPrincipalCanvasSliders() {
	document.querySelectorAll('.builder-block .priHisSwiper').forEach(swiperEl => {
		if (swiperEl.swiper || typeof Swiper === 'undefined') return;
		const root = swiperEl.closest('.pri-his');
		new Swiper(swiperEl, {
			centeredSlides: true,
			slidesPerView: 'auto',
			loop: false,
			speed: 500,
			slideToClickedSlide: false,
			allowTouchMove: false,
			observer: true,
			observeParents: true,
			watchSlidesProgress: true,
			navigation: {
				nextEl: root?.querySelector('.btn-next'),
				prevEl: root?.querySelector('.btn-prev')
			}
		});
	});
}

function focusPrincipalAddedItem() {
	if (!_principalFocusRequest) return;
	const { blockId, itemIndex } = _principalFocusRequest;
	_principalFocusRequest = null;
	const escapedBlockId = window.CSS?.escape ? CSS.escape(blockId) : String(blockId).replace(/"/g, '\\"');
	const blockEl = document.querySelector(`.builder-block[data-block-id="${escapedBlockId}"]`);
	const principalEl = blockEl?.querySelector('.pri-his');
	const target = getPrincipalItemNodes(principalEl)[itemIndex];
	if (!target) return;
	const swiper = principalEl?.querySelector('.priHisSwiper')?.swiper;
	if (swiper) swiper.slideTo(itemIndex, 0);
	target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
	target.classList.add('is-principal-added-focus');
	setTimeout(() => target.classList.remove('is-principal-added-focus'), 1200);
}

// 상징(symbol) 템플릿의 교표/교기/교화/교목/교가 영역처럼 [data-box-key]가 붙은
// 영역을 옵션 패널 체크박스 또는 캔버스의 X 버튼으로 켜고 끌 수 있게 한다.
// item.removedBoxes에 key가 들어있으면 렌더링 시 해당 영역을 통째로 제거한다.
function applyRemovableBoxes(el, item, block, columnIndex) {
	const removedBoxes = Array.isArray(item.removedBoxes) ? item.removedBoxes : [];
	el.querySelectorAll('[data-box-key]').forEach(boxEl => {
		const key = boxEl.dataset.boxKey;
		if (removedBoxes.includes(key)) {
			boxEl.remove();
			return;
		}
		if (block) {
			boxEl.classList.add('has-box-remove');
			boxEl.insertAdjacentHTML('beforeend', `
				<button type="button" class="symbol-box-remove-btn" data-remove-box-block-id="${escapeAttr(block.id)}" data-remove-box-column-index="${columnIndex}" data-remove-box-key="${escapeAttr(key)}" aria-label="${escapeAttr(key)} 영역 삭제" title="영역 삭제">
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>`);
		}
	});
}

function removeSymbolBox(blockId, columnIndex, key) {
	const items = getEditTargetItems(blockId);
	const item = items?.[0];
	if (!item) return;
	pushHistory();
	const removed = Array.isArray(item.removedBoxes) ? item.removedBoxes.slice() : [];
	if (!removed.includes(key)) removed.push(key);
	item.removedBoxes = removed;
	render();
}

function toggleSymbolBox(blockId, key, visible) {
	const items = getEditTargetItems(blockId);
	const item = items?.[0];
	if (!item) return;
	pushHistory();
	const removed = Array.isArray(item.removedBoxes) ? item.removedBoxes.slice() : [];
	item.removedBoxes = visible ? removed.filter(k => k !== key) : (removed.includes(key) ? removed : [...removed, key]);
	render();
}

// "영역 표시" 체크박스를 현재 item.removedBoxes 상태와 다시 맞춘다.
// 캔버스의 X 버튼으로 영역을 지웠을 때도(옵션 패널을 다시 열지 않아도) render()에서
// 곧바로 호출되어 체크 해제가 반영되도록 한다.
function syncSymbolBoxCheckboxes(blockId) {
	const symbolBoxSection = document.getElementById('propsSymbolBoxSection');
	if (!symbolBoxSection || symbolBoxSection.style.display === 'none') return;
	const block = resolveEditableBlockData(blockId);
	if (!block || templateCategories[block.type] !== 'symbol') return;
	const items = getEditTargetItems(blockId);
	const item = items?.[0] || {};
	const removedBoxes = Array.isArray(item.removedBoxes) ? item.removedBoxes : [];
	const template = componentTemplates[block.type];
	const availableKeys = template ? Array.from(template.element.querySelectorAll('[data-box-key]')).map(el => el.dataset.boxKey) : [];
	symbolBoxSection.querySelectorAll('[data-symbol-box-row]').forEach(row => {
		const key = row.dataset.symbolBoxRow;
		row.style.display = availableKeys.includes(key) ? '' : 'none';
		const checkbox = row.querySelector('input[type="checkbox"]');
		if (checkbox) checkbox.checked = !removedBoxes.includes(key);
	});
}

function renderAddColumnWrapElement(template, item, block, columnIndex, editable) {
	if (block && templateCategories[block.type] === 'table') {
		return renderTableDynamically(block, item, columnIndex, editable);
	}
	if (item.rows && block && templateCategories[block.type] === 'list') {
		return renderListDynamically(block, item, columnIndex, template.element, editable);
	}
	const source = template.isRootWrap ? template.element : template.addRowWrap;
	const el = source.cloneNode(true);
	let principalItemSuffixes = null;
	if (block && templateCategories[block.type] === 'principal') {
		applyPrincipalItemCount(el, block, item);
		// data-edit-field가 지워지기 전(아래 forEach, 내보내기 시 제거됨)에
		// 항목별 번호를 미리 뽑아 둔다 — applyPrincipalBioOverrides가 나중에
		// 이 배열로 항목을 식별한다.
		principalItemSuffixes = getPrincipalItemNodes(el).map(getPrincipalItemFieldSuffix);
	}
	if (block && templateCategories[block.type] === 'history') {
		applyHistoryTypeAItemCount(el, block, item);
		applyHistoryManagedOverride(el, item);
		if (block.type === 'history-tyA') el.classList.toggle('ty-img', !!block.historyImgVariant);
	}
	Array.from(el.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			el.removeAttribute(attr.name);
		}
	});
	el.querySelectorAll('[data-edit-field]').forEach(field => {
		if (template.editListLiTemplate && field.closest('.edit-list')) return;
		const fieldName = field.dataset.editField;
		setFieldContent(field, item[fieldName] || '');
		if (editable && block) {
			field.dataset.blockId = block.id;
			field.dataset.columnIndex = String(columnIndex);
			return;
		}
		field.removeAttribute('data-edit-field');
	});
	if (template.editListLiTemplate) {
		renderEditListInElement(el, template.editListLiTemplate, item, block, columnIndex, editable);
	}
	if (block && templateCategories[block.type] === 'principal') {
		applyPrincipalBioOverrides(el, item, principalItemSuffixes);
	}
	// title-list: list-wrap .inner 표시/숨김 처리
	if (block && templateCategories[block.type] === 'title-list') {
		const listWrapEl = el.querySelector('.list-wrap');
		if (listWrapEl) {
			const listWrapId = `${block.id}::list::${columnIndex}`;
			if (editable) listWrapEl.dataset.listBlockId = listWrapId;
			const innerEl = listWrapEl.querySelector('.inner');
			const rowListBlock = item.listBlock ?? null;
			if (!block.useList) {
				if (innerEl) innerEl.remove();
			} else if (rowListBlock) {
				const listTemplate = componentTemplates[rowListBlock.type];
				if (listTemplate) {
					const fakeBlock = {
						id: listWrapId,
						type: rowListBlock.type,
						columns: rowListBlock.items.length || 1,
						items: rowListBlock.items
					};
					const rendered = buildColumnBlock(listTemplate, fakeBlock, editable);
					const renderedHtml = typeof rendered === 'string' ? rendered : elementToHtml(rendered);
					listWrapEl.innerHTML = editable
						? `<div class="inner list-wrap-inner">
							<button type="button" class="list-wrap-remove" data-list-block-id="${listWrapId}" aria-label="리스트 삭제"><i class="ri-close-line"></i></button>
							${renderedHtml}
						</div>`
						: `<div class="inner">${renderedHtml}</div>`;
				}
			} else if (!editable) {
				if (innerEl) innerEl.innerHTML = '';
			}
		}
	}
	applyRemovableBoxes(el, item, editable ? block : null, columnIndex);
	if (!editable) stripEditorAttributes(el);
	return el;
}

function getEditListItems(item) {
	return Object.keys(item)
		.filter(k => /^item\d+$/.test(k))
		.sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)))
		.map(k => ({ key: k, value: item[k] }));
}

function renderEditListInElement(outerEl, editListLiTemplate, item, block, columnIndex, editable) {
	const editList = outerEl.querySelector('.edit-list');
	if (!editList) return;
	const entries = getEditListItems(item);
	if (!entries.length) return;
	editList.innerHTML = '';
	entries.forEach(entry => {
		const li = editListLiTemplate.cloneNode(false);
		li.innerHTML = entry.value;
		if (editable && block) {
			li.dataset.editField = entry.key;
			li.dataset.blockId = block.id;
			li.dataset.columnIndex = String(columnIndex);
		} else {
			li.removeAttribute('data-edit-field');
		}
		editList.appendChild(li);
	});
}

function addListItem(blockId, columnIndex, afterFieldKey) {
	const targetItems = getEditTargetItems(blockId);
	if (!targetItems || !targetItems[columnIndex]) return;
	pushHistory();
	const item = targetItems[columnIndex];
	const entries = getEditListItems(item);
	const idx = entries.findIndex(e => e.key === afterFieldKey);
	entries.splice(idx + 1, 0, { key: '', value: '새 항목' });
	entries.forEach((e, i) => { e.key = `item${i + 1}`; });
	const nextFieldKey = entries[Math.max(0, idx + 1)]?.key || afterFieldKey;
	Object.keys(item).filter(k => /^item\d+$/.test(k)).forEach(k => delete item[k]);
	entries.forEach(e => { item[e.key] = e.value; });
	_listEditTarget = { blockId, columnIndex, fieldKey: nextFieldKey };
	render();
	restoreListEditButtons();
}

function deleteListItem(blockId, columnIndex, fieldKey) {
	const targetItems = getEditTargetItems(blockId);
	if (!targetItems || !targetItems[columnIndex]) return;
	const item = targetItems[columnIndex];
	const entries = getEditListItems(item);
	if (entries.length <= 1) return;
	pushHistory();
	const newEntries = entries.filter(e => e.key !== fieldKey);
	newEntries.forEach((e, i) => { e.key = `item${i + 1}`; });
	const nextFieldKey = newEntries[0]?.key || '';
	Object.keys(item).filter(k => /^item\d+$/.test(k)).forEach(k => delete item[k]);
	newEntries.forEach(e => { item[e.key] = e.value; });
	_listEditTarget = nextFieldKey ? { blockId, columnIndex, fieldKey: nextFieldKey } : null;
	render();
	restoreListEditButtons();
}

function renderRepeatedColumns(block) {
	const template = componentTemplates[block.type];

	if (templateCategories[block.type] === 'table') {
		const item = block.items[0];
		if (!item) return '';
		const el = renderTableDynamically(block, item, 0, true);
		el.setAttribute('style', columnStyleVars(item));
		el.classList.add('block-item');
		el.dataset.blockId = block.id;
		el.dataset.columnIndex = '0';
		return elementToHtml(el);
	}

	if (templateCategories[block.type] === 'list' && block.items[0]?.rows) {
		const item = block.items[0];
		const el = renderListDynamically(block, item, 0, template.element, true);
		el.setAttribute('style', columnStyleVars(item));
		el.classList.add('block-item');
		el.dataset.blockId = block.id;
		el.dataset.columnIndex = '0';
		const listFirstChild = el.firstElementChild;
		if (listFirstChild) {
			if (block.blockAlign) {
				listFirstChild.classList.remove('al', 'ac', 'ar');
				listFirstChild.classList.add(block.blockAlign);
			}
		}
		return elementToHtml(el);
	}

	if (template.isRootWrap) {
		return block.items.map((item, index) => {
			const el = renderAddColumnWrapElement(template, item, block, index, true);
			el.setAttribute('style', columnStyleVars(item));
			el.classList.add('block-item');
			el.dataset.blockId = block.id;
			el.dataset.columnIndex = String(index);
			if (/^newsletter-\d+__section_1$/.test(block.type)) {
				const logoImg = el.querySelector('img[data-nl-logo]');
				const logoFrame = el.querySelector('.nl-logo-frame');
				if (logoImg) {
					if (block.nlLogoSrc) {
						logoImg.setAttribute('src', block.nlLogoSrc);
						logoImg.setAttribute('alt', block.nlLogoAlt || '');
						logoImg.style.display = '';
					} else {
						logoImg.style.display = 'none';
					}
				}
				if (logoFrame) logoFrame.dataset.hasLogo = block.nlLogoSrc ? '1' : '0';
				const deptVal = (item || {}).dept || '';
				const phoneVal = (item || {}).phone || '';
				const contactRow = el.querySelector('.nl-header-info');
				if (contactRow) contactRow.style.display = (!deptVal && !phoneVal) ? 'none' : '';
			}
			// Render body blocks only for section-container templates (those with initialBodyBlocks).
			const _tplCanvas = componentTemplates[block.type];
			if (_tplCanvas?.initialBodyBlocks?.length > 0) {
				const contentArea = el.querySelector('[data-edit-field="body"]');
				if (contentArea) {
					contentArea.style.setProperty('--nl-content-fs', (block.nlContentFontSize || 15) + 'px');
					const bodyBlocks = state.blocks.filter(b => b._isNlBodyBlock && b._parentSectionId === block.id);
					if (bodyBlocks.length > 0) {
						contentArea.innerHTML = '';
						bodyBlocks.forEach(bb => {
							const sepBefore = document.createElement('div');
							sepBefore.className = 'nl-body-sep';
							sepBefore.dataset.nlBodySepBefore = bb.id;
							sepBefore.dataset.nlBodySepSection = block.id;
							contentArea.appendChild(sepBefore);

							const bbTemplate = componentTemplates[bb.type];
							if (!bbTemplate) return;
							const wrapper = document.createElement('div');
							wrapper.className = 'nl-block-insert nl-body-block-wrap';
							wrapper.dataset.nlBodyBlockId = bb.id;
							const gapPx = (bb.marginBottom !== undefined && bb.marginBottom !== null)
								? bb.marginBottom
								: (12);
							if (bb.marginTop) wrapper.style.marginTop = bb.marginTop + 'px';
							wrapper.style.marginBottom = gapPx + 'px';
							if (bb.marginLeft && bb.blockAlign !== 'ac') wrapper.style.marginLeft = bb.marginLeft + 'px';
							if (bb.marginRight && bb.blockAlign !== 'ac' && bb.blockAlign !== 'ar') wrapper.style.marginRight = bb.marginRight + 'px';
							const nlEffectiveWidth = _calcEffectiveWidth(bb.blockWidth, bb.blockAlign ? 0 : bb.marginLeft, bb.blockAlign ? 0 : bb.marginRight);
							if (nlEffectiveWidth) wrapper.style.width = nlEffectiveWidth;
							if (bb.blockAlign === 'ac') { wrapper.style.marginLeft = 'auto'; wrapper.style.marginRight = 'auto'; }
							else if (bb.blockAlign === 'ar') { wrapper.style.marginLeft = 'auto'; }
							const bbInnerHtml = renderRepeatedColumns(bb);
							const ctrlHtml = `<div class="inner-block-actions"><div class="nl-body-drag-handle inner-block-btn" draggable="true" data-nl-body-drag-for="${bb.id}" title="드래그해서 순서 변경"><i class="ri-draggable"></i></div><button type="button" class="inner-block-btn inner-block-btn--remove" data-nl-body-delete-id="${bb.id}" title="삭제" aria-hidden="true"><i class="ri-delete-bin-line"></i></button></div>`;
							wrapper.innerHTML = ctrlHtml + (bb.blockIndent ? `<div class="indent">${bbInnerHtml}</div>` : bbInnerHtml);
							contentArea.appendChild(wrapper);
						});
						const sepEnd = document.createElement('div');
						sepEnd.className = 'nl-body-sep nl-body-sep--end';
						sepEnd.dataset.nlBodySepBefore = '';
						sepEnd.dataset.nlBodySepSection = block.id;
						contentArea.appendChild(sepEnd);
					}
				}
			}
			return elementToHtml(el);
		}).join('');
	}

	return buildColumnBlock(template, block, true);
}

// Render a block as non-editable HTML for export.
function _renderBlockExportHtml(block) {
	const template = componentTemplates[block.type];
	if (!template) return '';
	if (templateCategories[block.type] === 'table') {
		const item = block.items[0];
		if (!item) return '';
		const el = renderTableDynamically(block, item, 0, false);
		stripEditorAttributes(el);
		return elementToHtml(el);
	}
	if (templateCategories[block.type] === 'list' && block.items[0]?.rows) {
		const item = block.items[0];
		const el = renderListDynamically(block, item, 0, template.element, false);
		stripEditorAttributes(el);
		return elementToHtml(el);
	}
	const el = buildColumnBlock(template, block, false);
	return el instanceof Element ? elementToHtml(el) : String(el);
}

function buildColumnBlock(template, block, editable, innerTableEditable = false) {
	const outer = template.element.cloneNode(true);
	Array.from(outer.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			outer.removeAttribute(attr.name);
		}
	});
	let principalItemSuffixes = null;
	if (block && templateCategories[block.type] === 'principal') {
		applyPrincipalItemCount(outer, block, block.items[0] || {});
		// data-edit-field가 지워지기 전(아래에서 !editable이면 제거됨)에
		// 항목별 번호를 미리 뽑아 둔다 — applyPrincipalBioOverrides가 나중에
		// 이 배열로 항목을 식별한다.
		principalItemSuffixes = getPrincipalItemNodes(outer).map(getPrincipalItemFieldSuffix);
	}
	if (block && templateCategories[block.type] === 'history') {
		applyHistoryTypeAItemCount(outer, block, block.items[0] || {});
		applyHistoryManagedOverride(outer, block.items[0] || {});
		if (block.type === 'history-tyA') outer.classList.toggle('ty-img', !!block.historyImgVariant);
	}
	outer.setAttribute('style', columnStyleVars(block.items[0] || {}));

	if (editable) {
		outer.classList.add('block-item');
		outer.dataset.blockId = block.id;
		outer.dataset.columnIndex = '0';
	}

	const firstChild = outer.firstElementChild;
	if (firstChild) {
		if (block.blockAlign) {
			firstChild.classList.remove('al', 'ac', 'ar');
			firstChild.classList.add(block.blockAlign);
		}
	}

	const addRowWrapEl = outer.querySelector('.add-row-wrap');
	if (addRowWrapEl) {
		outer.querySelectorAll('[data-edit-field]').forEach(field => {
			if (addRowWrapEl.contains(field)) return;
			const fieldName = field.dataset.editField;
			setFieldContent(field, (block.items[0] || {})[fieldName] || '');
			if (editable || innerTableEditable) {
				field.dataset.blockId = block.id;
				field.dataset.columnIndex = '0';
			} else {
				field.removeAttribute('data-edit-field');
			}
		});

		const rowContainer = addRowWrapEl.parentElement;
		rowContainer.innerHTML = block.items.map((item, idx) => {
			const el = template.addRowWrap.cloneNode(true);
			el.querySelectorAll('[data-edit-field]').forEach(field => {
				const fieldName = field.dataset.editField;
				setFieldContent(field, item[fieldName] || '');
				if (editable || innerTableEditable) {
					field.dataset.blockId = block.id;
					field.dataset.columnIndex = String(idx);
				} else {
					field.removeAttribute('data-edit-field');
				}
			});
			if (!editable && !innerTableEditable) stripEditorAttributes(el);
			return elementToHtml(el);
		}).join('');
	} else {
		outer.querySelectorAll('[data-edit-field]').forEach(field => {
			const fieldName = field.dataset.editField;
			setFieldContent(field, (block.items[0] || {})[fieldName] || '');
			if (editable || innerTableEditable) {
				field.dataset.blockId = block.id;
				field.dataset.columnIndex = '0';
			} else {
				field.removeAttribute('data-edit-field');
			}
		});
	}

	applyRemovableBoxes(outer, block.items[0] || {}, editable ? block : null, 0);

	// Sync box image src/alt from block data.
	if (block && block.type === 'box-04') {
		const boxImg = outer.querySelector('img[data-box-img]');
		if (boxImg) {
			if (block.imgSrc) boxImg.setAttribute('src', block.imgSrc);
			if (block.imgAlt !== undefined) boxImg.setAttribute('alt', block.imgAlt);
			if (!editable) boxImg.removeAttribute('data-box-img');
		}
	}

	// Sync newsletter header logo image.
	if (block && /^newsletter-\d+__section_1$/.test(block.type)) {
		const logoImg = outer.querySelector('img[data-nl-logo]');
		const logoFrame = outer.querySelector('.nl-logo-frame');
		if (logoImg) {
			if (block.nlLogoSrc) {
				logoImg.setAttribute('src', block.nlLogoSrc);
				logoImg.setAttribute('alt', block.nlLogoAlt || '');
				logoImg.style.display = '';
			} else {
				logoImg.style.display = 'none';
			}
			if (!editable) logoImg.removeAttribute('data-nl-logo');
		}
		if (logoFrame) logoFrame.dataset.hasLogo = block.nlLogoSrc ? '1' : '0';
		const deptEl = outer.querySelector('.nl-dept');
		const phoneEl = outer.querySelector('.nl-phone');
		if (deptEl && phoneEl) {
			const deptVal = (block.items[0] || {}).dept || '';
			const phoneVal = (block.items[0] || {}).phone || '';
			const contactRow = outer.querySelector('.nl-header-info');
			if (contactRow) {
				contactRow.style.display = (!deptVal && !phoneVal) ? 'none' : '';
			}
		}
	}

	if (block && block.type === 'title-02') {
		const iconsWrap = outer.querySelector('[data-privacy-icons-wrap]');
		if (iconsWrap) {
			const icons = Array.isArray(block.privacyIcons) ? block.privacyIcons : [];
			if (icons.length > 0) {
				iconsWrap.innerHTML = icons.map(src =>
					`<img class="tit-privacy-icon" src="${escapeAttr(src)}" alt="" aria-hidden="true">`
				).join('');
				iconsWrap.style.display = '';
			} else {
				iconsWrap.innerHTML = '';
				iconsWrap.style.display = 'none';
			}
			if (!editable) iconsWrap.removeAttribute('data-privacy-icons-wrap');
		}
		const titleH4 = outer.querySelector('h4');
		if (titleH4) {
			if (block.anchorId) titleH4.setAttribute('id', block.anchorId);
			else titleH4.removeAttribute('id');
		}
	}

	if (block && isMixContainer(block.type)) {
		const slotEl = outer.querySelector('.mix-inner-slot');
		if (slotEl) {
			const innerBlocks = block.innerBlocks || [];
			if (innerBlocks.length > 0) {
				slotEl.innerHTML = innerBlocks.map((ib, idx) => {
					const innerTemplate = componentTemplates[ib.type];
					if (!innerTemplate) return '';
					if (editable) {
						const innerBlockId = `${block.id}::inner::${idx}`;
						const fakeBlock = { id: innerBlockId, type: ib.type, columns: ib.items.length || 1, items: ib.items,
							listMarkerType: ib.listMarkerType || '',
							...(block.type === 'button-00' && templateCategories[ib.type] === 'button' ? { btnSize: ib.btnSize || '', btnOpenType: ib.btnOpenType || 'default', btnIcon: ib.btnIcon || 'ri-external-link-line', btnIconPos: ib.btnIconPos || 'before' } : {}) };
						const isListInner = templateCategories[ib.type] === 'list';
						let innerHtml;
						if (isListInner && fakeBlock.items[0]?.rows) {
							const listItem = fakeBlock.items[0];
							const listEl = renderListDynamically(fakeBlock, listItem, 0, innerTemplate.element, true);
							listEl.setAttribute('style', columnStyleVars(listItem));
							listEl.classList.add('block-item');
							listEl.dataset.blockId = innerBlockId;
							listEl.dataset.columnIndex = '0';
							innerHtml = elementToHtml(listEl);
						} else {
							innerHtml = buildColumnBlock(innerTemplate, fakeBlock, true);
						}
						const _ibStyles = [];
						if (ib.marginTop) _ibStyles.push(`margin-top:${ib.marginTop}px`);
						if (ib.marginBottom != null) _ibStyles.push(`margin-bottom:${ib.marginBottom}px`);
						if (ib.marginLeft) _ibStyles.push(`margin-left:${ib.marginLeft}px`);
						if (ib.marginRight) _ibStyles.push(`margin-right:${ib.marginRight}px`);
						const mbStyle = _ibStyles.length ? ` style="${_ibStyles.join(';')}"` : '';
						const removeHtml = `<button type="button" class="mix-inner-remove inner-block-btn inner-block-btn--remove" data-mix-block-id="${block.id}" data-mix-inner-idx="${idx}" aria-label="내부 블록 제거"><i class="ri-close-line"></i></button>`;
						return `<div class="mix-inner-item" draggable="true" data-mix-block-id="${block.id}" data-mix-inner-idx="${idx}" data-inner-block-id="${innerBlockId}"${mbStyle}>
							<div class="mix-inner-drag-handle" title="드래그해서 순서 변경"><i class="ri-draggable"></i></div>
							${_innerBlockActionsHtml('', removeHtml)}
							${innerHtml}
						</div>`;
					} else {
						const fakeBlock = { id: `${block.id}-inner-${idx}`, type: ib.type, columns: ib.items.length || 1, items: ib.items,
							listMarkerType: ib.listMarkerType || '',
							...(block.type === 'button-00' && templateCategories[ib.type] === 'button' ? { btnSize: ib.btnSize || '', btnOpenType: ib.btnOpenType || 'default', btnIcon: ib.btnIcon || 'ri-external-link-line', btnIconPos: ib.btnIconPos || 'before' } : {}) };
						let innerContent;
						if (templateCategories[ib.type] === 'table') {
							const tableEl = renderTableDynamically(fakeBlock, fakeBlock.items[0] || {}, 0, false);
							innerContent = elementToHtml(tableEl);
						} else if (templateCategories[ib.type] === 'list' && fakeBlock.items[0]?.rows) {
							const listItem = fakeBlock.items[0];
							const listEl = renderListDynamically(fakeBlock, listItem, 0, innerTemplate.element, false);
							innerContent = elementToHtml(listEl);
						} else {
							const innerEl = buildColumnBlock(innerTemplate, fakeBlock, false);
							innerContent = elementToHtml(innerEl);
						}
						const _ibExStyles = [];
						if (ib.marginTop) _ibExStyles.push(`margin-top:${ib.marginTop}px`);
						if (ib.marginBottom != null) _ibExStyles.push(`margin-bottom:${ib.marginBottom}px`);
						if (ib.marginLeft) _ibExStyles.push(`margin-left:${ib.marginLeft}px`);
						if (ib.marginRight) _ibExStyles.push(`margin-right:${ib.marginRight}px`);
						const mbStyle = _ibExStyles.length ? ` style="${_ibExStyles.join(';')}"` : '';
						return `<div class="mix-inner-item"${mbStyle}>${innerContent}</div>`;
					}
				}).join('');
			} else if (editable) {
				slotEl.classList.add('mix-slot-empty');
				slotEl.innerHTML = '<div class="mix-slot-placeholder"><i class="ri-add-circle-line"></i> 디자인 블록을 드래그해 넣으세요.</div>';
			}
			if (editable) {
				slotEl.dataset.mixBlockId = block.id;
			}
		}
	}

	if (block && templateCategories[block.type] === 'title-list') {
		const listWrapEl = outer.querySelector('.list-wrap');
		if (listWrapEl) {
			const listWrapId = `${block.id}::list::0`;
			if (editable) listWrapEl.dataset.listBlockId = listWrapId;
			const innerEl = listWrapEl.querySelector('.inner');
			const rowListBlock = block.items[0]?.listBlock ?? null;
			if (!block.useList) {
				if (innerEl) innerEl.remove();
			} else if (rowListBlock) {
				const listTemplate = componentTemplates[rowListBlock.type];
				if (listTemplate) {
					const fakeBlock = {
						id: listWrapId,
						type: rowListBlock.type,
						columns: rowListBlock.items.length || 1,
						items: rowListBlock.items
					};
					const renderedHtml = buildColumnBlock(listTemplate, fakeBlock, editable);
					const rendered = typeof renderedHtml === 'string' ? renderedHtml : elementToHtml(renderedHtml);
					listWrapEl.innerHTML = editable
						? `<div class="inner list-wrap-inner">
							<button type="button" class="list-wrap-remove" data-list-block-id="${listWrapId}" aria-label="리스트 삭제"><i class="ri-close-line"></i></button>
							${rendered}
						</div>`
						: `<div class="inner">${rendered}</div>`;
				}
			} else if (!editable) {
				if (innerEl) innerEl.innerHTML = '';
			}
		}
	}

	const linkEl = outer.querySelector('a[data-link]');
	if (linkEl) {
		if (block.linkHref) linkEl.setAttribute('href', block.linkHref);
		if (block.linkTarget) linkEl.setAttribute('target', block.linkTarget);
		// text-03: target??_blank?대㈃ title="?덉갹", ?꾨땲硫?title ?쒓굅
		if (block.type === 'text-03') {
			const effectiveTarget = block.linkTarget || '_blank';
			if (effectiveTarget === '_blank') {
				linkEl.setAttribute('title', '?덉갹');
			} else {
				linkEl.removeAttribute('title');
			}
		}
		linkEl.removeAttribute('data-link');
	}

	outer.querySelectorAll('.ico[data-ico]').forEach(icoEl => {
		let icoId = icoEl.getAttribute('data-ico');
		if (block && block.type === 'box-05' && block.icoId) {
			icoId = block.icoId;
			icoEl.setAttribute('data-ico', icoId);
		}
		const svg = ICO_SVG_MAP[icoId];
		if (svg) icoEl.innerHTML = svg;
	});

	if (block && templateCategories[block.type] === 'button' && !isMixContainer(block.type)) {
		const btnEl = outer.querySelector('button.btn-st');
		if (btnEl) {
			// ?ъ씠利??대옒???곸슜
			btnEl.classList.remove('size-sm', 'size-lg', 'size-exlg');
			if (block.btnSize) btnEl.classList.add(block.btnSize);

			const isNewWindow = block.btnOpenType === 'new-window';
			if (isNewWindow) {
				btnEl.setAttribute('target', '_blank');
				btnEl.setAttribute('title', '?덉갹 ?대룞');
			} else {
				btnEl.removeAttribute('target');
				btnEl.removeAttribute('title');
			}

			if (['button-01','button-02','button-03','button-04'].includes(block.type)) {
				const existingIco = btnEl.querySelector('i[aria-hidden]');
				if (existingIco) existingIco.remove();
				if (isNewWindow) {
					btnEl.classList.add('icon');
					const icoEl = document.createElement('i');
					icoEl.className = 'ri-external-link-line';
					icoEl.setAttribute('aria-hidden', 'true');
					btnEl.appendChild(icoEl);
				} else {
					btnEl.classList.remove('icon');
				}
			}

			if (block.type === 'button-05' || block.type === 'button-06') {
				const icoEl = btnEl.querySelector('i');
				if (icoEl) {
					icoEl.className = isNewWindow ? 'ri-external-link-line' : (block.btnIcon || 'ri-external-link-line');
					icoEl.setAttribute('aria-hidden', 'true');

					if (block.type === 'button-05') {
						const spanEl = btnEl.querySelector('span[data-edit-field]') || btnEl.querySelector('span:not(.hid)');
						if (spanEl) {
							if (block.btnIconPos === 'after') {
								if (btnEl.lastElementChild !== icoEl) btnEl.appendChild(icoEl);
							} else {
								if (btnEl.firstElementChild !== icoEl) btnEl.insertBefore(icoEl, btnEl.firstChild);
							}
						}
					}
				}
			}
		}
	}

	if (block && templateCategories[block.type] === 'process') {
		const ul = outer.querySelector('.prosess-st');
		if (ul) {
			const isHoriz = ul.classList.contains('horiz');
			const steps = block.items || [];
			if (isHoriz) {
				ul.classList.remove('col-2', 'col-3', 'col-4', 'col-5', 'col-6');
				if (steps.length >= 2 && steps.length <= 6) ul.classList.add(`col-${steps.length}`);
			}
			ul.innerHTML = steps.map((item, idx) => {
				const isFin = idx === steps.length - 1;
				const finClass = isFin ? ' class="fin"' : '';
				const titleVal = item.title || '';
				const subVal = item.sub || '';
				let titleHtml, subHtml;
				if (editable) {
					titleHtml = `<h6 data-edit-field="title" data-block-id="${escapeAttr(block.id)}" data-column-index="${idx}">${titleVal}</h6>`;
					subHtml = subVal ? `<p data-edit-field="sub" data-block-id="${escapeAttr(block.id)}" data-column-index="${idx}">${subVal}</p>` : '';
				} else {
					titleHtml = `<h6>${titleVal}</h6>`;
					subHtml = subVal ? `<p>${subVal}</p>` : '';
				}
				let inrHtml = '';
				if (!isHoriz && !isFin) {
					const innerBlocks = item.innerBlocks || [];
					if (editable) {
						const slotId = `${block.id}::pstep::${idx}`;
						const isEmpty = innerBlocks.length === 0;
						let innerItemsHtml;
						if (isEmpty) {
							innerItemsHtml = '<div class="mix-slot-placeholder"><i class="ri-add-circle-line"></i> 디자인 블록을 드래그해 넣으세요.</div>';
						} else {
							innerItemsHtml = innerBlocks.map((ib, ibIdx) => {
								const innerTemplate = componentTemplates[ib.type];
								if (!innerTemplate) return '';
								const innerBlockId = `${slotId}::inner::${ibIdx}`;
								const fakeBlock = { id: innerBlockId, type: ib.type, columns: ib.items.length || 1, items: ib.items };
								const isListInner = templateCategories[ib.type] === 'list';
								let innerHtml;
								if (isListInner && fakeBlock.items[0]?.rows) {
									const listItem = fakeBlock.items[0];
									const listEl = renderListDynamically(fakeBlock, listItem, 0, innerTemplate.element, true);
									listEl.setAttribute('style', columnStyleVars(listItem));
									listEl.classList.add('block-item');
									listEl.dataset.blockId = innerBlockId;
									listEl.dataset.columnIndex = '0';
									innerHtml = elementToHtml(listEl);
								} else {
									innerHtml = buildColumnBlock(innerTemplate, fakeBlock, true);
								}
								const mbStyle = ib.marginBottom != null ? ` style="margin-bottom:${ib.marginBottom}px"` : '';
								const removeHtml = `<button type="button" class="mix-inner-remove pstep-inner-remove inner-block-btn inner-block-btn--remove" data-pstep-block-id="${escapeAttr(block.id)}" data-pstep-idx="${idx}" data-pstep-inner-idx="${ibIdx}" aria-label="내부 블록 제거"><i class="ri-close-line"></i></button>`;
								return `<div class="mix-inner-item pstep-inner-item" draggable="true" data-pstep-block-id="${escapeAttr(block.id)}" data-pstep-idx="${idx}" data-pstep-inner-idx="${ibIdx}" data-inner-block-id="${innerBlockId}"${mbStyle}>
									<div class="mix-inner-drag-handle" title="드래그해서 순서 변경"><i class="ri-draggable"></i></div>
									${_innerBlockActionsHtml('', removeHtml)}
									${innerHtml}
								</div>`;
							}).join('');
						}
						inrHtml = `<div class="inr process-inner-slot${isEmpty ? ' mix-slot-empty' : ''}" data-pstep-block-id="${escapeAttr(block.id)}" data-pstep-idx="${idx}">${innerItemsHtml}</div>`;
					} else {
						let innerContent = '';
						if (innerBlocks.length > 0) {
							innerContent = innerBlocks.map((ib, ibIdx) => {
								const innerTemplate = componentTemplates[ib.type];
								if (!innerTemplate) return '';
								const fakeBlock = { id: `${block.id}-p${idx}-i${ibIdx}`, type: ib.type, columns: ib.items.length || 1, items: ib.items };
								const isListInner = templateCategories[ib.type] === 'list';
								let content;
								if (isListInner && fakeBlock.items[0]?.rows) {
									const listItem = fakeBlock.items[0];
									const listEl = renderListDynamically(fakeBlock, listItem, 0, innerTemplate.element, false);
									content = elementToHtml(listEl);
								} else {
									const innerEl = buildColumnBlock(innerTemplate, fakeBlock, false);
									content = typeof innerEl === 'string' ? innerEl : elementToHtml(innerEl);
								}
								const mbStyle = ib.marginBottom != null ? ` style="margin-bottom:${ib.marginBottom}px"` : '';
								return `<div class="mix-inner-item"${mbStyle}>${content}</div>`;
							}).join('');
						}
						inrHtml = `<div class="inr">${innerContent}</div>`;
					}
				}
				const canRemove = editable && steps.length > 2;
				const removeStepHtml = canRemove ? `<button type="button" class="pstep-step-remove-btn" data-block-id="${escapeAttr(block.id)}" data-step-idx="${idx}" title="단계 삭제" aria-label="단계 삭제"><i class="ri-close-line"></i></button>` : '';
				return `<li${finClass}><div class="tit">${titleHtml}${subHtml}${removeStepHtml}</div>${inrHtml}</li>`;
			}).join('');
			const prevAddRow = ul.parentNode.querySelector('.pstep-add-row');
			if (prevAddRow) prevAddRow.remove();
			if (editable) {
				const maxReached = isHoriz && steps.length >= 6;
				if (!maxReached) {
					const addRowEl = document.createElement('div');
					addRowEl.className = 'pstep-add-row';
					addRowEl.innerHTML = `<button type="button" class="pstep-add-btn" data-block-id="${escapeAttr(block.id)}"><i class="ri-add-line"></i> 단계 추가</button>`;
					ul.insertAdjacentElement('afterend', addRowEl);
				}
			}
		}
	}

	if (block && templateCategories[block.type] === 'tab') {
		const tabContainer = outer.querySelector('.tab-st');
		const tabUl = tabContainer ? tabContainer.querySelector('ul') : null;
		if (tabContainer && tabUl) {
			ensureTabActionDefaults(block);
			const tabItems = block.tabItems || [];
			const tabCols = block.tabCols || '4';
			tabContainer.classList.remove('col-2', 'col-3', 'col-4', 'col-5');
			tabContainer.classList.add(`col-${tabCols}`);

			tabUl.innerHTML = tabItems.map((item, idx) => {
				const isFirst = idx === 0;
				const isDisabled = item.type === 'disabled';
				const isNewWindow = item.type === 'new_window';
				const liClass = isFirst ? ' class="on"' : '';
				const liTitle = isFirst ? ` title="${escapeAttr(item.text)} 선택됨"` : '';
				const isLinkMode = block.tabMode === 'link';
				const linkHref = isLinkMode ? (item.href || '#') : '';
				const linkTarget = isLinkMode ? (item.target || '_self') : (isNewWindow ? '_blank' : '');
				const aHref = ` href="${escapeAttr(linkHref)}"`;
				const aTarget = linkTarget ? ` target="${escapeAttr(linkTarget)}"` : '';
				const aTitle = isNewWindow ? ` title="새 창"` : '';
				const aDis = isDisabled ? ` class="dis"` : '';
				const tabActionAttr = isLinkMode ? ` data-klic-tab-action="link" data-klic-tab-href="${escapeAttr(linkHref)}" data-klic-tab-target="${escapeAttr(linkTarget || '_self')}"` : ` data-klic-tab-action="panel"`;
				const tabIdxAttr = `${editable ? ` data-tab-block-id="${escapeAttr(block.id)}"` : ''} data-tab-item-idx="${idx}"`;
				const canRemove = editable && tabItems.length > 2;
				const removeTabHtml = canRemove ? `<button type="button" class="tab-item-remove-btn" data-block-id="${escapeAttr(block.id)}" data-tab-idx="${idx}" title="탭 삭제" aria-label="탭 삭제"><i class="ri-close-line"></i></button>` : '';
				return `<li${liClass}${liTitle}><a${aHref}${aTarget}${aTitle}${aDis}${tabActionAttr}${tabIdxAttr}>${escapeHtml(item.text)}</a>${removeTabHtml}</li>`;
			}).join('');

			let panelEl = outer.querySelector(':scope > .tabs-01-panel');
			if (block.tabMode === 'link') {
				if (panelEl) panelEl.remove();
			} else {
				if (!panelEl) {
					panelEl = document.createElement('div');
					panelEl.className = 'tabs-01-panel';
					tabContainer.insertAdjacentElement('afterend', panelEl);
				}
				panelEl.innerHTML = tabItems.map((item, idx) => {
					const panelContent = (item.content || '').trim();
					const contentHtml = panelContent || '내용을 입력하세요.';
					const editAttrs = editable ? ` data-edit-field="tabPanelContent" data-block-id="${escapeAttr(block.id)}" data-column-index="${idx}"` : '';
					return `<div class="tabs-01-panel-item${idx === 0 ? ' is-active' : ''}" data-tab-panel-idx="${idx}">
						<div class="cntnts"${editAttrs}>${contentHtml}</div>
					</div>`;
				}).join('');
			}
			const prevTabAddRow = outer.querySelector('.tab-add-row');
			if (prevTabAddRow) prevTabAddRow.remove();
			if (editable) {
				const tabAddRowEl = document.createElement('div');
				tabAddRowEl.className = 'tab-add-row';
				tabAddRowEl.innerHTML = `<button type="button" class="tab-add-btn" data-block-id="${escapeAttr(block.id)}"><i class="ri-add-line"></i> 탭 추가</button>`;
				outer.appendChild(tabAddRowEl);
			}
		}
	}

	if (block && templateCategories[block.type] === 'accordion') {
		const accordionContainer = outer.querySelector('.accordion-st');
		const accordionUl = accordionContainer ? accordionContainer.querySelector('ul') : null;
		if (accordionContainer && accordionUl) {
			const accordionItems = block.accordionItems || [];
			const accordionSize = block.accordionSize || '';
			accordionContainer.classList.remove('size-md', 'size-lg');
			if (accordionSize) accordionContainer.classList.add(accordionSize);

			accordionUl.innerHTML = accordionItems.map((item, idx) => {
				const isDisabled = !!item.disabled;
				const liClass = isDisabled ? ' class="dis"' : '';
				const titleText = escapeHtml(item.text || '');
				const rawContent = item.content ? item.content.trim() : '';
				const contentHtml = rawContent ? formatMultiline(rawContent) : '내용이 없습니다.';
				const canRemove = editable && accordionItems.length > 1;
				const removeItemHtml = canRemove ? `<button type="button" class="accordion-item-remove-btn" data-block-id="${escapeAttr(block.id)}" data-item-idx="${idx}" title="항목 삭제" aria-label="항목 삭제"><i class="ri-close-line"></i></button>` : '';
				return `<li${liClass}><button class="tit" type="button">${titleText}</button>${removeItemHtml}<div class="cntnts">${contentHtml}</div></li>`;
			}).join('');
			const prevAccAddRow = outer.querySelector('.accordion-add-row');
			if (prevAccAddRow) prevAccAddRow.remove();
			if (editable) {
				const accAddRowEl = document.createElement('div');
				accAddRowEl.className = 'accordion-add-row';
				accAddRowEl.innerHTML = `<button type="button" class="accordion-add-btn" data-block-id="${escapeAttr(block.id)}"><i class="ri-add-line"></i> 항목 추가</button>`;
				accordionUl.insertAdjacentElement('afterend', accAddRowEl);
			}
		}
	}

	if (block && block.type === 'accordion-03') {
		const discloserEl = outer.querySelector('.discloser-st');
		if (discloserEl) {
			const titleBtn = discloserEl.querySelector(':scope > button.tit');
			const cntnts = discloserEl.querySelector(':scope > .cntnts');
			if (titleBtn) titleBtn.textContent = block.discloserTitle || 'Discloser';
			if (cntnts) {
				const rawContent = (block.discloserContent || '').trim();
				cntnts.innerHTML = rawContent ? formatMultiline(rawContent) : '내용이 없습니다.';
			}
		}
	}

	const slotChildren = block ? state.blocks.filter(b => b._slotParentId === block.id && b._slotField) : [];
	if (slotChildren.length > 0) {
		const byField = {};
		slotChildren.forEach(sc => {
			if (!byField[sc._slotField]) byField[sc._slotField] = [];
			byField[sc._slotField].push(sc);
		});
		Object.entries(byField).forEach(([field, children]) => {
			const fieldEl = outer.querySelector(`[data-edit-field="${field}"]`);
			if (!fieldEl) return;
			fieldEl.innerHTML = '';
			fieldEl.removeAttribute('contenteditable');
			if (editable) {
				fieldEl.dataset.blockId = block.id;
				fieldEl.dataset.columnIndex = '0';
				fieldEl.classList.add('template-slot-field');
			}
			children.forEach(child => {
				const wrapper = document.createElement('div');
				wrapper.className = 'nl-block-insert nl-body-block-wrap';
				if (editable) {
					wrapper.dataset.nlBodyBlockId = child.id;
					const mbPx = child.marginBottom ?? 0;
					if (child.marginTop) wrapper.style.marginTop = child.marginTop + 'px';
					wrapper.style.marginBottom = mbPx + 'px';
					const ctrlHtml = _innerBlockActionsHtml(
						'',
						`<button type="button" class="inner-block-btn inner-block-btn--remove" data-nl-body-delete-id="${child.id}" title="삭제" aria-hidden="true"><i class="ri-delete-bin-line"></i></button>`
					);
					const childHtml = renderRepeatedColumns(child);
					wrapper.innerHTML = ctrlHtml + (child.blockIndent ? `<div class="indent">${childHtml}</div>` : childHtml);
				} else {
					const childHtml = _renderBlockExportHtml(child);
					wrapper.innerHTML = child.blockIndent ? `<div class="indent">${childHtml}</div>` : childHtml;
				}
				fieldEl.appendChild(wrapper);
			});
		});
	}

	if (block && templateCategories[block.type] === 'principal') {
		applyPrincipalBioOverrides(outer, block.items[0] || {}, principalItemSuffixes);
	}
	if (!editable && !innerTableEditable) stripEditorAttributes(outer);
	return editable ? elementToHtml(outer) : outer;
}


let _iconDrawerTarget = null;


function openIconDrawer(categoryIndex, blockId, columnIndex, initialGroupId = null) {
	if (!ICON_CATEGORIES.length) return;

	document.querySelectorAll('[data-edit-field="icon"].icon-editing').forEach(el => el.classList.remove('icon-editing'));
	const targetIconEl = document.querySelector(
		`.builder-block[data-block-id="${blockId}"] .block-item[data-column-index="${columnIndex}"] [data-edit-field="icon"]`
	);
	if (targetIconEl) targetIconEl.classList.add('icon-editing');

	_iconDrawerTarget = { blockId, columnIndex };

	const treeEl = document.getElementById('iconTree');
	treeEl.innerHTML = ICON_CATEGORIES.map((cat, i) => {
		const hasGroups = cat.groups && cat.groups.length;
		return `
		<div class="icon-tree-cat${i === categoryIndex ? ' is-open' : ''}" data-cat-index="${i}">
			<button type="button" class="icon-tree-cat-btn">
				<span class="icon-tree-cat-label">${escapeHtml(cat.label)}</span>
				${hasGroups ? '<i class="ri-arrow-right-s-line icon-tree-arrow" aria-hidden="true"></i>' : ''}
			</button>
			${hasGroups ? `
			<ul class="icon-tree-group-list">
				${cat.groups.map(g => `
				<li>
					<button type="button" class="icon-tree-group-btn" data-cat-index="${i}" data-group-id="${escapeHtml(g.id)}">
						${escapeHtml(g.label)}
					</button>
				</li>`).join('')}
			</ul>` : ''}
		</div>`;
	}).join('');

	treeEl.querySelectorAll('.icon-tree-cat-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const catEl = btn.closest('.icon-tree-cat');
			const wasOpen = catEl.classList.contains('is-open');
			treeEl.querySelectorAll('.icon-tree-cat').forEach(el => el.classList.remove('is-open'));
			if (!wasOpen) {
				catEl.classList.add('is-open');
				const ci = Number(catEl.dataset.catIndex);
				const cat = ICON_CATEGORIES[ci];
				const allIcons = cat.groups
					? (cat.groups).flatMap(g => g.icons || [])
					: (cat.icons || []);
				renderIconGrid(allIcons);
			} else {
				clearIconGrid();
			}
		});
	});

	treeEl.querySelectorAll('.icon-tree-group-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			treeEl.querySelectorAll('.icon-tree-group-btn').forEach(b => b.classList.remove('is-active'));
			btn.classList.add('is-active');
			const ci = Number(btn.dataset.catIndex);
			const gid = btn.dataset.groupId;
			const cat = ICON_CATEGORIES[ci];
			const group = cat.groups.find(g => g.id === gid);
			if (group) renderIconGrid(group.icons || []);
		});
	});

	if (categoryIndex >= 0) {
		const openCat = treeEl.querySelector(`.icon-tree-cat[data-cat-index="${categoryIndex}"]`);
		if (openCat) openCat.classList.add('is-open');
		const cat = ICON_CATEGORIES[categoryIndex];
		if (cat) {
			if (initialGroupId && cat.groups) {
				const groupBtn = treeEl.querySelector(`.icon-tree-group-btn[data-cat-index="${categoryIndex}"][data-group-id="${initialGroupId}"]`);
				if (groupBtn) groupBtn.classList.add('is-active');
				const group = cat.groups.find(g => g.id === initialGroupId);
				renderIconGrid(group ? group.icons || [] : []);
			} else {
				const allIcons = cat.groups
					? cat.groups.flatMap(g => g.icons || [])
					: (cat.icons || []);
				renderIconGrid(allIcons);
			}
		}
	}

	document.getElementById('iconDrawer').classList.add('is-open');
}

function renderIconGrid(icons) {
	const area = document.getElementById('iconGridArea');
	if (!icons.length) {
		area.innerHTML = '<p class="icon-grid-empty">아이콘이 없습니다.</p>';
		return;
	}
	area.innerHTML = `<div class="icon-drawer-grid">
		${icons.map(icon => `
		<button type="button" class="icon-drawer-item" data-src="${escapeHtml(icon.src)}" data-name="${escapeHtml(icon.name || '')}">
			<img src="${escapeHtml(icon.src)}" alt="${escapeHtml(icon.name || '')}">
			<span>${escapeHtml(icon.name || '')}</span>
		</button>`).join('')}
	</div>`;
	area.querySelectorAll('.icon-drawer-item').forEach(btn => {
		btn.addEventListener('click', () => applyIconFromDrawer(btn.dataset.src, btn.dataset.name));
	});
}

function clearIconGrid() {
	const area = document.getElementById('iconGridArea');
	area.innerHTML = '<p class="icon-grid-empty">왼쪽에서 카테고리를 선택하세요.</p>';
}

function applyIconFromDrawer(src, name) {
	if (!_iconDrawerTarget) return;
	const { blockId, columnIndex } = _iconDrawerTarget;
	const item = findItemByBlockId(blockId, columnIndex);
	if (!item) return;
	item.icon = `<img src="${src}" alt="${name}" class="block-icon-img">`;
	closeIconDrawer();
	render();
}

function closeIconDrawer() {
	document.getElementById('iconDrawer').classList.remove('is-open');
	document.querySelectorAll('[data-edit-field="icon"].icon-editing').forEach(el => el.classList.remove('icon-editing'));
	_iconDrawerTarget = null;
}

function findIconLocation(src) {
	let path;
	try { path = new URL(src).pathname.replace(/^\//, ''); } catch { path = src; }
	path = normalizeAssetPath(path).replace(/^\//, '');
	for (let i = 0; i < ICON_CATEGORIES.length; i++) {
		const cat = ICON_CATEGORIES[i];
		if (cat.groups && cat.groups.length) {
			for (const g of cat.groups) {
				if ((g.icons || []).some(icon => normalizeAssetPath(icon.src).replace(/^\//, '') === path)) {
					return { catIndex: i, groupId: g.id };
				}
			}
		} else {
			if ((cat.icons || []).some(icon => normalizeAssetPath(icon.src).replace(/^\//, '') === path)) {
				return { catIndex: i, groupId: null };
			}
		}
	}
	return { catIndex: 0, groupId: null };
}


function bindComponentEvents(container = document) {
	const getSelectedCanvasBlockId = () => {
		const selectedId = state.selectedItem?.blockId;
		if (!selectedId || selectedId.includes('::')) return null;
		return state.blocks.some(block => block.id === selectedId) ? selectedId : null;
	};

	KlicBuilderShared.bindComponentItems({
		container,
		canvasGrid,
		getDragPayload: item => {
			const isDecoration = item.dataset.decoration === 'true';
			const category = templateCategories[item.dataset.type] || '';
			const template = componentTemplates[item.dataset.type];
			if (template?.isInline) return `new-inline:${item.dataset.type}`;
			if (template?.isSmartInline) return `new-smart:${item.dataset.type}`;
			if (category === 'design-template') return `new-design-template:${item.dataset.type}`;
			return isDecoration
				? `overlay-type:${item.dataset.type}`
				: `new-block:${item.dataset.type}`;
		},
		onAdd: item => {
			const isDecoration = item.dataset.decoration === 'true';
			const category = templateCategories[item.dataset.type] || '';
			const template = componentTemplates[item.dataset.type];
			if (template?.isInline) {
				showPlacementToast('텍스트 블록 안으로 드래그하면 인라인으로 삽입됩니다.', 'info');
				return;
			}
			if (category === 'design-template') {
				addDesignTemplate(item.dataset.type);
			} else if (isDecoration) {
				const grid = document.getElementById('canvasGrid');
				const wrapper = document.getElementById('canvasWrapper');
				if (grid && wrapper) {
					const gRect = grid.getBoundingClientRect();
					const wRect = wrapper.getBoundingClientRect();
					const x = Math.max(0, (wRect.left + wRect.width / 2) - gRect.left - 60);
					const y = Math.max(0, (wRect.top + wRect.height / 2) - gRect.top - 60);
					addOverlay(item.dataset.type, x, y);
				} else {
					addOverlay(item.dataset.type, 100, 100);
				}
			} else {
				addBlock(item.dataset.type, getSelectedCanvasBlockId());
			}
		},
		onDragStart: item => {
			const isDecoration = item.dataset.decoration === 'true';
			const category = templateCategories[item.dataset.type] || '';
			const template = componentTemplates[item.dataset.type];
			state.dragPayload = template?.isInline
				? `new-inline:${item.dataset.type}`
				: template?.isSmartInline
				? `new-smart:${item.dataset.type}`
				: category === 'design-template'
				? `new-design-template:${item.dataset.type}`
				: isDecoration
				? `overlay-type:${item.dataset.type}`
				: `new-block:${item.dataset.type}`;
			const dragCat = templateCategories[item.dataset.type] || '';
			if (MIX_ALLOWED.has(dragCat)) {
				document.body.classList.add('is-mix-dragging');
			}
		},
		onDragEnd: () => {
			state.dragPayload = '';
			document.getElementById('canvasWrapper')?.classList.remove('is-decoration-over');
			document.body.classList.remove('is-mix-dragging');
			_clearInlineCaret();
		}
	});

	/* Legacy component binding moved to KlicBuilderShared.bindComponentItems.
	container.querySelectorAll('.component-item').forEach(item => {
		const isDecoration = item.dataset.decoration === 'true';
		const customDecorationId = item.dataset.customDecorationId || '';
		const addItemToCanvas = () => {
			if (isDecoration) {
				const grid = document.getElementById('canvasGrid');
				const wrapper = document.getElementById('canvasWrapper');
				if (grid && wrapper) {
					const gRect = grid.getBoundingClientRect();
					const wRect = wrapper.getBoundingClientRect();
					const x = Math.max(0, (wRect.left + wRect.width / 2) - gRect.left - 60);
					const y = Math.max(0, (wRect.top + wRect.height / 2) - gRect.top - 60);
					customDecorationId ? addCustomOverlay(customDecorationId, x, y) : addOverlay(item.dataset.type, x, y);
				} else {
					customDecorationId ? addCustomOverlay(customDecorationId, 100, 100) : addOverlay(item.dataset.type, 100, 100);
				}
			} else {
				addBlock(item.dataset.type);
			}
		};
		item.addEventListener('dragstart', event => {
			state.dragPayload = isDecoration
				? (customDecorationId ? `overlay-custom:${customDecorationId}` : `overlay-type:${item.dataset.type}`)
				: `new-block:${item.dataset.type}`;
			event.dataTransfer.setData('text/plain', state.dragPayload);
			event.dataTransfer.effectAllowed = 'copy';
			const dragCat = templateCategories[item.dataset.type] || '';
			if (['box', 'list', 'title-horizontal', 'title-vertical', 'divider', 'text'].includes(dragCat)) {
				document.body.classList.add('is-mix-dragging');
			}
		});
		item.addEventListener('dragend', () => {
			state.dragPayload = '';
			canvasGrid.classList.remove('is-over');
			document.getElementById('canvasWrapper')?.classList.remove('is-decoration-over');
			document.body.classList.remove('is-mix-dragging');
		});
		item.addEventListener('dblclick', event => {
			if (event.target.closest('button')) return;
			event.preventDefault();
			addItemToCanvas();
		});
		item.querySelector('.component-add-btn').addEventListener('click', event => {
			event.stopPropagation();
			addItemToCanvas();
		});
	});*/

}

function bindRenderedEvents() {
	document.querySelectorAll('.builder-block').forEach(block => {
		block.addEventListener('dragstart', event => {
			if (document.body.classList.contains('preview-mode')) {
				event.preventDefault();
				return;
			}
			if (event.target.closest('table [data-edit-field]')) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			if (event.target.closest('select') || event.target.closest('input') || event.target.closest('button') || event.target.closest('[contenteditable="true"]')) return;
			if (event.altKey) {
				state.dragPayload = `copy-block:${block.dataset.blockId}`;
				event.dataTransfer.effectAllowed = 'copy';
				requestAnimationFrame(() => {
					block.classList.add('dragging');
					block.classList.add('is-copy-dragging');
				});
			} else {
				state.dragPayload = `existing-block:${block.dataset.blockId}`;
				event.dataTransfer.effectAllowed = 'move';
				requestAnimationFrame(() => block.classList.add('dragging'));
			}
			event.dataTransfer.setData('text/plain', state.dragPayload);
		});
		block.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload;
			if (payload.startsWith('new-inline:')) {
				const field = event.target.closest('[data-edit-field]');
				if (field && field.dataset.editField !== 'icon') {
					event.preventDefault();
					event.stopPropagation();
					event.dataTransfer.dropEffect = 'copy';
					_showInlineCaret(event.clientX, event.clientY);
				}
				return;
			}
			if (payload.startsWith('new-smart:')) {
				const field = event.target.closest('[data-edit-field]');
				if (field && field.dataset.editField !== 'icon') {
					event.preventDefault();
					event.stopPropagation();
					event.dataTransfer.dropEffect = 'copy';
					_showInlineCaret(event.clientX, event.clientY);
				} else {
					event.preventDefault();
					_clearInlineCaret();
					setBlockDropIndicator(block, event);
				}
				return;
			}
			const slotField = event.target.closest('[data-edit-field]');
			if (slotField && slotField.dataset.editField !== 'icon' && !event.target.closest('.nl-body-block-wrap')) {
				if (payload.startsWith('new-block:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:')) {
					const slotParent = state.blocks.find(b => b.id === (slotField.dataset.blockId || block.dataset.blockId));
					if (slotField.dataset.editField === 'body' && componentTemplates[slotParent?.type]?.initialBodyBlocks?.length > 0) return;
					event.preventDefault();
					event.stopPropagation();
					event.dataTransfer.dropEffect = payload.startsWith('existing-block:') ? 'move' : 'copy';
					slotField.classList.add('mix-slot-over');
					return;
				}
			}
			if (payload.startsWith('new-block:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:')) {
				event.preventDefault();
				setBlockDropIndicator(block, event);
			}
		});
		block.addEventListener('dragleave', event => {
			if (!block.contains(event.relatedTarget)) {
				clearBlockDropIndicator(block);
				_clearInlineCaret();
			}
			event.target.closest?.('[data-edit-field]')?.classList.remove('mix-slot-over');
		});
		block.addEventListener('drop', handleBlockDrop);
		block.addEventListener('dragend', () => {
			state.dragPayload = '';
			block.classList.remove('dragging');
			block.classList.remove('is-copy-dragging');
			clearDropIndicators();
			_clearInlineCaret();
		});
		block.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[data-remove-block-id]')) return;
			if (event.target.closest('[data-duplicate-block-id]')) return;
			const pstepRemoveBtn = event.target.closest('.pstep-step-remove-btn');
			if (pstepRemoveBtn) { removeProcessStep(pstepRemoveBtn.dataset.blockId, Number(pstepRemoveBtn.dataset.stepIdx)); return; }
			const pstepAddBtn = event.target.closest('.pstep-add-btn');
			if (pstepAddBtn) { addProcessStep(pstepAddBtn.dataset.blockId); return; }
			const tabRemoveBtn = event.target.closest('.tab-item-remove-btn');
			if (tabRemoveBtn) { removeTabItem(tabRemoveBtn.dataset.blockId, Number(tabRemoveBtn.dataset.tabIdx)); return; }
			const tabAddBtn = event.target.closest('.tab-add-btn');
			if (tabAddBtn) { addTabItem(tabAddBtn.dataset.blockId); return; }
			const accRemoveBtn = event.target.closest('.accordion-item-remove-btn');
			if (accRemoveBtn) { removeAccordionItem(accRemoveBtn.dataset.blockId, Number(accRemoveBtn.dataset.itemIdx)); return; }
			const accAddBtn = event.target.closest('.accordion-add-btn');
			if (accAddBtn) { addAccordionItem(accAddBtn.dataset.blockId); return; }
			if (event.target.closest('[contenteditable="true"]')) return;
			if (event.target.closest('.block-item')) return;
			if (event.target.closest('.mix-inner-item')) return;
			if (event.target.closest('.table-cell-block-zone')) return;
			if (event.target.closest('.nl-body-block-wrap')) return;
			const blockId = block.dataset.blockId;
			selectBlock(blockId);
			if (_propsBlockId !== blockId) openBlockProps(blockId);
		});
	});

	document.querySelectorAll('.block-item').forEach(item => {
		item.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const symbolSongTarget = event.target.closest('.song-wrap, .edu-score-link, .edu-audio-btn, .edu-audio, .lyr');
			if (symbolSongTarget) {
				event.preventDefault();
				event.stopPropagation();
				const blockId = item.dataset.blockId;
				selectBlockItem(blockId, Number(item.dataset.columnIndex));
				openBlockProps(blockId);
				return;
			}
			if (event.target.closest('.pstep-step-remove-btn')) return;
			if (event.target.closest('.pstep-add-btn')) return;
			if (event.target.closest('.tab-item-remove-btn')) return;
			if (event.target.closest('.tab-add-btn')) return;
			if (event.target.closest('.accordion-item-remove-btn')) return;
			if (event.target.closest('.accordion-add-btn')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			if (event.target.closest('.mix-inner-item')) return;
			if (event.target.closest('.table-cell-block-zone')) return;
			if (event.target.closest('.nl-body-block-wrap')) return;
			const anchor = event.target.closest('a');
			if (anchor && (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download'))) {
				event.preventDefault();
			}
			event.stopPropagation();
			const blockId = item.dataset.blockId;
			selectBlockItem(blockId, Number(item.dataset.columnIndex));
			if (_propsBlockId !== blockId) openBlockProps(blockId);
		});
	});
	document.querySelectorAll('[data-duplicate-block-id]').forEach(button => {
		button.addEventListener('click', event => {
			event.stopPropagation();
			duplicateBlock(button.dataset.duplicateBlockId);
		});
	});
	document.querySelectorAll('[data-remove-block-id]').forEach(button => {
		button.addEventListener('click', event => {
			event.stopPropagation();
			removeBlock(button.dataset.removeBlockId);
		});
	});
	document.querySelectorAll('[data-edit-field]').forEach(field => {
		field.addEventListener('dblclick', event => {
			if (field.classList.contains('template-slot-field')) return;
			startTextEdit(event);
		});
	});
	document.querySelectorAll('table [data-table-section]').forEach(cell => {
		cell.addEventListener('mousedown', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.button !== 0) return;
			if (cell.getAttribute('contenteditable') === 'true') return;
			if (event.target.closest?.('[contenteditable="true"]')) return;
			if (event.target.closest('.table-cell-block-zone')) return;
			startTableCellDrag(cell, event);
		});
		cell.addEventListener('click', () => {
			if (!_propsBlockId) return;
			const blockId = cell.dataset.blockId;
			if (blockId !== _propsBlockId) return;
			const block = state.blocks.find(b => b.id === blockId);
			if (!block || block.type !== 'table-01') return;
			const rowKey = cell.dataset.tableRowKey;
			if (cell.dataset.tableSection !== 'tbody') return;
			const row = (block.tableTbodyRows || []).find(r => r.key === rowKey);
			if (!Array.isArray(row?.privacyIcons)) return;
			_currentPrivacyTableRowKey = { blockId, rowKey };
			_updatePrivacyTableIconGrid(block);
		});
		cell.addEventListener('mouseenter', () => {
			if (!state.tableCellDrag) return;
			updateTableDragRange(cell);
		});
		cell.addEventListener('contextmenu', event => openTableContextMenu(cell, event));
		cell.addEventListener('dragstart', event => {
			if (cell.getAttribute('contenteditable') === 'true' || event.target.closest?.('[contenteditable="true"]')) return;
			event.preventDefault();
		});
	});
	if (!_tableCellDragEventsBound) {
		_tableCellDragEventsBound = true;
		document.addEventListener('mouseup', finishTableCellDrag);
		document.addEventListener('mousedown', event => {
			const menu = document.getElementById('tableContextMenu');
			if (!menu || menu.style.display === 'none') return;
			if (menu.contains(event.target)) return;
			if (event.target.closest && event.target.closest('table [data-edit-field]')) return;
			closeTableContextMenu(false);
		});
	}
	document.querySelectorAll('[data-tab-block-id]').forEach(aEl => {
		aEl.addEventListener('dblclick', startTabTextEdit);
	});
	document.querySelectorAll('[data-edit-field="icon"]').forEach(field => {
		field.addEventListener('dblclick', event => {
			if (document.body.classList.contains('preview-mode')) return;
			event.stopPropagation();
			const item = field.closest('.block-item');
			if (!item) return;
			const imgEl = field.querySelector('img');
			const { catIndex, groupId } = imgEl ? findIconLocation(imgEl.src) : { catIndex: 0, groupId: null };
			openIconDrawer(catIndex, item.dataset.blockId, Number(item.dataset.columnIndex), groupId);
		});
	});
	// Bind drag/drop events for process inner slots.
	document.querySelectorAll('.process-inner-slot[data-pstep-block-id]').forEach(slot => {
		const pBlockId = slot.dataset.pstepBlockId;
		const pStepIdx = Number(slot.dataset.pstepIdx);
		slot.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload;
			if (payload.startsWith('new-block:')) {
				if (!MIX_ALLOWED.has(templateCategories[payload.replace('new-block:', '')])) return;
			} else if (payload.startsWith('existing-block:')) {
				const srcBlock = state.blocks.find(b => b.id === payload.replace('existing-block:', ''));
				if (!srcBlock || !MIX_ALLOWED.has(templateCategories[srcBlock.type])) return;
			} else {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = payload.startsWith('new-block:') ? 'copy' : 'move';
			slot.classList.add('mix-slot-over');
		});
		slot.addEventListener('dragleave', event => {
			if (!slot.contains(event.relatedTarget)) slot.classList.remove('mix-slot-over');
		});
		slot.addEventListener('drop', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
			slot.classList.remove('mix-slot-over');
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (!MIX_ALLOWED.has(templateCategories[newType])) return;
				event.preventDefault();
				event.stopPropagation();
				clearDropIndicators();
				state.dragPayload = '';
				addProcessStepInnerBlock(pBlockId, pStepIdx, newType);
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const srcBlock = state.blocks.find(b => b.id === srcId);
				if (!srcBlock || !MIX_ALLOWED.has(templateCategories[srcBlock.type])) return;
				event.preventDefault();
				event.stopPropagation();
				clearDropIndicators();
				state.dragPayload = '';
				addProcessStepInnerBlockFromExisting(pBlockId, pStepIdx, srcId);
			}
		});
	});

	setTimeout(() => {
		if (document.body.classList.contains('preview-mode')) return;
		$('.builder-block .accordion-st > ul > li:not(.dis) > button.tit').each(function () {
			$(this).off('click').on('click', function () {
				const $li = $(this).closest('li');
				const $cntnts = $li.find('> .cntnts');
				const isOpen = $li.hasClass('on');
				$li.siblings('.on').each(function () {
					$(this).removeClass('on').find('> .cntnts').stop().slideUp(200);
				});
				if (!isOpen) {
					$li.addClass('on');
					$cntnts.stop().slideDown(300);
				} else {
					$li.removeClass('on');
					$cntnts.stop().slideUp(200);
				}
			});
		});
	}, 0);

	document.querySelectorAll('.pstep-inner-remove').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			removeProcessStepInnerBlock(
				btn.dataset.pstepBlockId,
				Number(btn.dataset.pstepIdx),
				Number(btn.dataset.pstepInnerIdx)
			);
		});
	});


	// Reorder process inner items by drag/drop.
	let _pstepDragFrom = null;
	document.querySelectorAll('.pstep-inner-item[draggable]').forEach(item => {
		item.addEventListener('dragstart', event => {
			if (event.target.closest('button, input, select, textarea, [contenteditable="true"]')) {
				event.preventDefault();
				return;
			}
			_pstepDragFrom = {
				blockId: item.dataset.pstepBlockId,
				stepIdx: Number(item.dataset.pstepIdx),
				fromIdx: Number(item.dataset.pstepInnerIdx)
			};
			state.dragPayload = `pstep-reorder:${item.dataset.pstepBlockId}:${item.dataset.pstepIdx}:${item.dataset.pstepInnerIdx}`;
			event.dataTransfer.effectAllowed = 'move';
			event.stopPropagation();
			requestAnimationFrame(() => item.classList.add('mix-item-dragging'));
		});
		item.addEventListener('dragend', () => {
			item.classList.remove('mix-item-dragging');
			document.querySelectorAll('.mix-inner-item.mix-item-over').forEach(el => el.classList.remove('mix-item-over'));
			if (state.dragPayload.startsWith('pstep-reorder:')) state.dragPayload = '';
			_pstepDragFrom = null;
		});
		item.addEventListener('dragover', event => {
			if (!state.dragPayload.startsWith('pstep-reorder:')) return;
			if (_pstepDragFrom?.blockId !== item.dataset.pstepBlockId) return;
			if (_pstepDragFrom?.stepIdx !== Number(item.dataset.pstepIdx)) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = 'move';
			document.querySelectorAll('.mix-inner-item.mix-item-over').forEach(el => el.classList.remove('mix-item-over'));
			item.classList.add('mix-item-over');
		});
		item.addEventListener('dragleave', event => {
			if (!item.contains(event.relatedTarget)) item.classList.remove('mix-item-over');
		});
		item.addEventListener('drop', event => {
			if (!state.dragPayload.startsWith('pstep-reorder:')) return;
			event.preventDefault();
			event.stopPropagation();
			item.classList.remove('mix-item-over');
			const toIdx = Number(item.dataset.pstepInnerIdx);
			if (_pstepDragFrom && _pstepDragFrom.stepIdx === Number(item.dataset.pstepIdx) && _pstepDragFrom.fromIdx !== toIdx) {
				moveProcessStepInnerBlock(_pstepDragFrom.blockId, _pstepDragFrom.stepIdx, _pstepDragFrom.fromIdx, toIdx);
			}
			state.dragPayload = '';
			_pstepDragFrom = null;
		});
	});

	// Bind drag/drop events for mixed block inner slots.
	document.querySelectorAll('.mix-inner-slot[data-mix-block-id]').forEach(slot => {
		slot.addEventListener('dragover', event => {
			const payload = state.dragPayload;
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (!MIX_ALLOWED.has(templateCategories[newType])) return;
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const srcBlock = state.blocks.find(b => b.id === srcId);
				if (!srcBlock || !MIX_ALLOWED.has(templateCategories[srcBlock.type])) return;
			} else {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = payload.startsWith('new-block:') ? 'copy' : 'move';
			slot.classList.add('mix-slot-over');
		});
		slot.addEventListener('dragleave', event => {
			if (!slot.contains(event.relatedTarget)) {
				slot.classList.remove('mix-slot-over');
			}
		});
		slot.addEventListener('drop', event => {
			const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (!MIX_ALLOWED.has(templateCategories[newType])) return;
				event.preventDefault();
				event.stopPropagation();
				slot.classList.remove('mix-slot-over');
				clearDropIndicators();
				state.dragPayload = '';
				addMixInnerBlock(slot.dataset.mixBlockId, newType);
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const srcBlock = state.blocks.find(b => b.id === srcId);
				if (!srcBlock || !MIX_ALLOWED.has(templateCategories[srcBlock.type])) return;
				event.preventDefault();
				event.stopPropagation();
				slot.classList.remove('mix-slot-over');
				clearDropIndicators();
				state.dragPayload = '';
				addMixInnerBlockFromExisting(slot.dataset.mixBlockId, srcId);
			}
		});
	});
	document.querySelectorAll('.mix-inner-remove').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			removeMixInnerBlock(btn.dataset.mixBlockId, Number(btn.dataset.mixInnerIdx));
		});
	});
	document.querySelectorAll('.table-cell-inner-remove').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			removeTableCellInnerBlock(btn.dataset.blockId, btn.dataset.cellKey);
		});
	});
	document.querySelectorAll('.table-cell-block-zone.is-empty[data-cell-block-zone]').forEach(zone => {
		zone.addEventListener('dragover', event => {
			const payload = state.dragPayload;
			if (!payload.startsWith('new-block:') && !payload.startsWith('existing-block:')) return;
			const blockType = payload.startsWith('new-block:')
				? payload.replace('new-block:', '')
				: state.blocks.find(b => b.id === payload.replace('existing-block:', ''))?.type;
			if (!blockType || !MIX_ALLOWED.has(templateCategories[blockType])) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = payload.startsWith('new-block:') ? 'copy' : 'move';
			zone.classList.add('is-drag-over');
		});
		zone.addEventListener('dragleave', event => {
			if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-drag-over');
		});
		zone.addEventListener('drop', event => {
			zone.classList.remove('is-drag-over');
			const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
			const blockId = zone.dataset.blockId;
			const cellKey = zone.dataset.cellKey;
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (!MIX_ALLOWED.has(templateCategories[newType])) return;
				event.preventDefault();
				event.stopPropagation();
				addTableCellInnerBlock(blockId, cellKey, newType);
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const srcBlock = state.blocks.find(b => b.id === srcId);
				if (!srcBlock || !MIX_ALLOWED.has(templateCategories[srcBlock.type])) return;
				event.preventDefault();
				event.stopPropagation();
				addTableCellInnerBlockFromExisting(blockId, cellKey, srcId);
			}
		});
	});
	// Reorder inner items in mixed blocks.
	let _mixDragFrom = null;

	document.querySelectorAll('.mix-inner-item[draggable]').forEach(item => {
		if (item.classList.contains('pstep-inner-item')) return;
		item.addEventListener('dragstart', event => {
			if (event.target.closest('button, input, select, textarea, [contenteditable="true"]')) {
				event.preventDefault();
				return;
			}
			_mixDragFrom = { outerBlockId: item.dataset.mixBlockId, fromIdx: Number(item.dataset.mixInnerIdx) };
			state.dragPayload = `mix-inner-reorder:${item.dataset.mixBlockId}:${item.dataset.mixInnerIdx}`;
			event.dataTransfer.effectAllowed = 'move';
			event.stopPropagation();
			requestAnimationFrame(() => item.classList.add('mix-item-dragging'));
		});
		item.addEventListener('dragend', () => {
			item.classList.remove('mix-item-dragging');
			document.querySelectorAll('.mix-inner-item.mix-item-over').forEach(el => el.classList.remove('mix-item-over'));
			if (state.dragPayload.startsWith('mix-inner-reorder:')) state.dragPayload = '';
			_mixDragFrom = null;
		});
		item.addEventListener('dragover', event => {
			if (!state.dragPayload.startsWith('mix-inner-reorder:')) return;
			const fromId = _mixDragFrom?.outerBlockId;
			if (fromId !== item.dataset.mixBlockId) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = 'move';
			document.querySelectorAll('.mix-inner-item.mix-item-over').forEach(el => el.classList.remove('mix-item-over'));
			item.classList.add('mix-item-over');
		});
		item.addEventListener('dragleave', event => {
			if (!item.contains(event.relatedTarget)) item.classList.remove('mix-item-over');
		});
		item.addEventListener('drop', event => {
			if (!state.dragPayload.startsWith('mix-inner-reorder:')) return;
			event.preventDefault();
			event.stopPropagation();
			item.classList.remove('mix-item-over');
			const toIdx = Number(item.dataset.mixInnerIdx);
			if (_mixDragFrom && _mixDragFrom.fromIdx !== toIdx) {
				moveMixInnerBlock(_mixDragFrom.outerBlockId, _mixDragFrom.fromIdx, toIdx);
			}
			state.dragPayload = '';
			_mixDragFrom = null;
		});
	});
	bindEditListEvents();

	document.querySelectorAll('.mix-inner-props').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			openBlockProps(btn.dataset.mixInnerPropsId);
		});
	});

	document.querySelectorAll('.mix-inner-item[data-inner-block-id]').forEach(item => {
		item.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('.mix-inner-remove')) return;
			if (event.target.closest('.mix-inner-drag-handle')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			event.stopPropagation();
			const innerBlockId = item.dataset.innerBlockId;
			if (_propsBlockId !== innerBlockId) openBlockProps(innerBlockId);
		});
	});

	document.querySelectorAll('.table-cell-inner-props').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			openBlockProps(btn.dataset.tcellInnerPropsId);
		});
	});

	document.querySelectorAll('.table-cell-block-zone.has-block[data-inner-block-id]').forEach(zone => {
		zone.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('.table-cell-inner-remove')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			event.stopPropagation();
			const innerBlockId = zone.dataset.innerBlockId;
			if (_propsBlockId !== innerBlockId) openBlockProps(innerBlockId);
		});
	});

	// Bind drag/drop and click events for title-list wrapped list blocks.
	document.querySelectorAll('.list-wrap[data-list-block-id]').forEach(slot => {
		const listWrapId = slot.dataset.listBlockId; // "outerBlockId::list::N"
		const outerBlockId = listWrapId.replace(/::list::\d+$/, '');
		slot.addEventListener('click', event => {
			event.stopPropagation();
			if (event.target.closest('.list-wrap-remove') || event.target.closest('.list-wrap-inner')) return;
			switchFilterTab('list');
			selectBlock(outerBlockId);
		});
		const removeBtn = slot.querySelector('.list-wrap-remove');
		if (removeBtn) {
			removeBtn.addEventListener('click', event => {
				event.stopPropagation();
				clearListWrapBlock(listWrapId);
			});
		}
		slot.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (!slot.querySelector('.list-wrap-placeholder')) return;
			const payload = state.dragPayload;
			if (payload.startsWith('new-block:')) {
				if (templateCategories[payload.replace('new-block:', '')] !== 'list') return;
			} else if (payload.startsWith('existing-block:')) {
				const src = state.blocks.find(b => b.id === payload.replace('existing-block:', ''));
				if (!src || templateCategories[src.type] !== 'list') return;
			} else {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			slot.classList.add('list-wrap-over');
		});
		slot.addEventListener('dragleave', event => {
			if (!slot.contains(event.relatedTarget)) slot.classList.remove('list-wrap-over');
		});
		slot.addEventListener('drop', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (!slot.querySelector('.list-wrap-placeholder')) return;
			const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
			slot.classList.remove('list-wrap-over');
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (templateCategories[newType] !== 'list') return;
				event.preventDefault();
				event.stopPropagation();
				clearDropIndicators();
				state.dragPayload = '';
				setListWrapBlock(slot.dataset.listBlockId, newType);
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const src = state.blocks.find(b => b.id === srcId);
				if (!src || templateCategories[src.type] !== 'list') return;
				event.preventDefault();
				event.stopPropagation();
				clearDropIndicators();
				state.dragPayload = '';
				setListWrapFromExisting(slot.dataset.listBlockId, srcId);
			}
		});
	});

	document.querySelectorAll('[data-edit-field="body"]').forEach(bodyArea => {
		bodyArea.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('.nl-body-sep')) return;
			const payload = state.dragPayload;
			if (!payload.startsWith('new-block:') && !payload.startsWith('existing-block:')) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = 'copy';
			bodyArea.classList.add('nl-body-drop-over');
		});
		bodyArea.addEventListener('dragleave', event => {
			if (!bodyArea.contains(event.relatedTarget)) {
				bodyArea.classList.remove('nl-body-drop-over');
				document.querySelectorAll('.nl-body-sep--over').forEach(el => el.classList.remove('nl-body-sep--over'));
			}
		});
	});

	document.querySelectorAll('[data-list-row]').forEach(span => {
		span.addEventListener('dragover', e => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload;
			if (!payload.startsWith('new-block:') && !payload.startsWith('existing-block:')) return;
			e.preventDefault();
			e.stopPropagation();
			e.dataTransfer.dropEffect = 'copy';
			span.classList.add('list-row-drop-over');
		});
		span.addEventListener('dragleave', e => {
			if (!span.contains(e.relatedTarget)) span.classList.remove('list-row-drop-over');
		});
		span.addEventListener('drop', e => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload || e.dataTransfer.getData('text/plain');
			const isNew = payload.startsWith('new-block:');
			const isExisting = payload.startsWith('existing-block:');
			if (!isNew && !isExisting) return;
			e.preventDefault();
			e.stopPropagation();
			span.classList.remove('list-row-drop-over');
			clearDropIndicators();
			state.dragPayload = '';
			const rowKey = span.dataset.editField;
			const listBlockId = span.dataset.blockId;
			const listBlock = state.blocks.find(b => b.id === listBlockId);
			if (!listBlock) return;
			const row = _findListRow(listBlock, rowKey);
			if (!row) return;
			pushHistory();
			if (row.blockRef) {
				state.blocks = state.blocks.filter(b => b.id !== row.blockRef);
				delete row.blockRef;
			}
			let newSlotBlockId = null;
			if (isNew) {
				const type = payload.replace('new-block:', '');
				if (!componentTemplates[type]) return;
				const child = createBlock(type);
				child._slotParentId = listBlockId;
				child._slotField = rowKey;
				child.marginBottom = 0;
				state.blocks.push(child);
				row.blockRef = child.id;
				newSlotBlockId = child.id;
			} else {
				const existingId = payload.replace('existing-block:', '');
				const existing = state.blocks.find(b => b.id === existingId);
				if (!existing) return;
				existing._slotParentId = listBlockId;
				existing._slotField = rowKey;
				row.blockRef = existingId;
			}
			render();
			if (newSlotBlockId) openBlockProps(newSlotBlockId);
		});
	});

	document.querySelectorAll('[data-nl-body-props-id]').forEach(btn => {
		btn.addEventListener('click', e => {
			e.stopPropagation();
			openBlockProps(btn.dataset.nlBodyPropsId);
		});
	});

	document.querySelectorAll('.nl-body-block-wrap').forEach(wrap => {
		wrap.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[data-nl-body-delete-id]')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			event.stopPropagation();
			const innerBlockId = wrap.dataset.nlBodyBlockId;
			if (!innerBlockId) return;
			if (_propsBlockId !== innerBlockId) openBlockProps(innerBlockId);
		});
	});

	document.querySelectorAll('[data-nl-body-delete-id]').forEach(btn => {
		btn.addEventListener('click', e => {
			e.stopPropagation();
			const id = btn.dataset.nlBodyDeleteId;
			pushHistory();
			const dying = state.blocks.find(b => b.id === id);
			if (dying && dying._slotParentId) {
				const parent = state.blocks.find(b => b.id === dying._slotParentId);
				if (parent && templateCategories[parent.type] === 'list') {
					const item = parent.items[0];
					if (item && item.rows) {
						const clearRef = (rows) => rows.forEach(row => {
							if (row.blockRef === id) delete row.blockRef;
							if (row.children?.length) clearRef(row.children);
						});
						clearRef(item.rows);
					}
				}
			}
			state.blocks = state.blocks.filter(b => b.id !== id);
			if (_propsBlockId === id) closeBlockProps();
			render();
		});
	});

	let _nlBodyDragId = null;
	document.querySelectorAll('.nl-body-drag-handle[draggable]').forEach(handle => {
		handle.addEventListener('dragstart', event => {
			const blockId = handle.dataset.nlBodyDragFor;
			if (!blockId) { event.preventDefault(); return; }
			_nlBodyDragId = blockId;
			state.dragPayload = `nl-body-reorder:${blockId}`;
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', state.dragPayload);
			event.stopPropagation();
			document.body.classList.add('nl-body-dragging');
			const wrap = handle.closest('.nl-body-block-wrap');
			if (wrap) requestAnimationFrame(() => wrap.classList.add('nl-body-block-dragging'));
		});
		handle.addEventListener('dragend', () => {
			document.body.classList.remove('nl-body-dragging');
			const wrap = handle.closest('.nl-body-block-wrap');
			if (wrap) wrap.classList.remove('nl-body-block-dragging');
			document.querySelectorAll('.nl-body-sep--over').forEach(el => el.classList.remove('nl-body-sep--over'));
			if (state.dragPayload.startsWith('nl-body-reorder:')) state.dragPayload = '';
			_nlBodyDragId = null;
		});
	});

	// Bind newsletter body separators as drop targets.
	document.querySelectorAll('.nl-body-sep').forEach(sep => {
		sep.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload;
			if (!payload.startsWith('nl-body-reorder:') && !payload.startsWith('new-block:') && !payload.startsWith('existing-block:')) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = payload.startsWith('nl-body-reorder:') ? 'move' : 'copy';
			document.querySelectorAll('.nl-body-sep--over').forEach(el => el.classList.remove('nl-body-sep--over'));
			sep.classList.add('nl-body-sep--over');
		});
		sep.addEventListener('dragleave', event => {
			if (!sep.contains(event.relatedTarget)) sep.classList.remove('nl-body-sep--over');
		});
		sep.addEventListener('drop', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
			const isReorder = payload.startsWith('nl-body-reorder:');
			const isNew = payload.startsWith('new-block:');
			const isExisting = payload.startsWith('existing-block:');
			if (!isReorder && !isNew && !isExisting) return;
			event.preventDefault();
			event.stopPropagation();
			sep.classList.remove('nl-body-sep--over');
			document.body.classList.remove('nl-body-dragging');
			clearDropIndicators();
			const refBlockId = sep.dataset.nlBodySepBefore;
			const sectionId = sep.dataset.nlBodySepSection;
			state.dragPayload = '';
			if (isReorder) {
				const dragId = _nlBodyDragId || payload.replace('nl-body-reorder:', '');
				_nlBodyDragId = null;
				if (!dragId || dragId === refBlockId) return;
				moveNlBodyBlock(dragId, refBlockId || null);
			} else if (isNew) {
				const type = payload.replace('new-block:', '');
				if (!componentTemplates[type]) return;
				pushHistory();
				const bodyBlock = createBlock(type);
				bodyBlock._isNlBodyBlock = true;
				bodyBlock._parentSectionId = sectionId;
				bodyBlock.marginBottom = 0;
				if (refBlockId) {
					const refIdx = state.blocks.findIndex(b => b.id === refBlockId);
					if (refIdx >= 0) state.blocks.splice(refIdx, 0, bodyBlock);
					else state.blocks.push(bodyBlock);
				} else {
					state.blocks.push(bodyBlock);
				}
				render();
				openBlockProps(bodyBlock.id);
			} else if (isExisting) {
				const existingId = payload.replace('existing-block:', '');
				const existing = state.blocks.find(b => b.id === existingId);
				if (!existing) return;
				pushHistory();
				state.blocks = state.blocks.filter(b => b.id !== existingId);
				existing._isNlBodyBlock = true;
				existing._parentSectionId = sectionId;
				if (refBlockId) {
					const refIdx = state.blocks.findIndex(b => b.id === refBlockId);
					if (refIdx >= 0) state.blocks.splice(refIdx, 0, existing);
					else state.blocks.push(existing);
				} else {
					state.blocks.push(existing);
				}
				render();
			}
		});
	});

	// 상징(symbol) 템플릿의 교표/교기/교화/교목/교가 등 [data-box-key] 영역 삭제 버튼
	document.querySelectorAll('[data-remove-box-key]').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			removeSymbolBox(btn.dataset.removeBoxBlockId, Number(btn.dataset.removeBoxColumnIndex), btn.dataset.removeBoxKey);
		});
	});
}

function setBlockDropIndicator(block, event) {
	clearDropIndicators(block);
	const payload = state.dragPayload;
	const targetBlockData = state.blocks.find(b => b.id === block.dataset.blockId);

	if (targetBlockData && isTitleBlock(targetBlockData.type)) {
		let dragType = null;
		if (payload.startsWith('new-block:')) {
			dragType = payload.replace('new-block:', '');
		} else if (payload.startsWith('existing-block:')) {
			dragType = state.blocks.find(b => b.id === payload.replace('existing-block:', ''))?.type;
		} else if (payload.startsWith('copy-block:')) {
			dragType = state.blocks.find(b => b.id === payload.replace('copy-block:', ''))?.type;
		}
		if (dragType && isTitleBlock(dragType) && demoteTitleType(targetBlockData.type)) {
			const rect = block.getBoundingClientRect();
			const ratio = (event.clientY - rect.top) / rect.height;
			if (ratio >= 0.2 && ratio <= 0.8) {
				block.dataset.dropPosition = 'inside-title';
				block.classList.add('is-over', 'is-over-inside-title');
				return;
			}
		}
	}

	block.dataset.dropPosition = 'after';
	block.classList.add('is-over', 'is-over-after');
}

function clearBlockDropIndicator(block) {
	block.classList.remove('is-over', 'is-over-before', 'is-over-after', 'is-over-inside-title');
	delete block.dataset.dropPosition;
}

function clearDropIndicators(exceptBlock = null) {
	document.querySelectorAll('.builder-block.is-over').forEach(block => {
		if (block !== exceptBlock) clearBlockDropIndicator(block);
	});
	canvasGrid.classList.remove('is-over');
}

function selectBlock(blockId) {
	document.querySelectorAll('.block-item.is-selected').forEach(el => el.classList.remove('is-selected'));
	document.querySelectorAll('.builder-block.is-selected').forEach(el => el.classList.remove('is-selected'));
	const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (blockEl) blockEl.classList.add('is-selected');
	state.selectedItem = { blockId, columnIndex: null };
}

function selectBlockItem(blockId, columnIndex) {
	document.querySelectorAll('.block-item.is-selected').forEach(el => el.classList.remove('is-selected'));
	document.querySelectorAll('.builder-block.is-selected').forEach(el => el.classList.remove('is-selected'));
	const item = document.querySelector(`.block-item[data-block-id="${blockId}"][data-column-index="${columnIndex}"]`);
	if (item) item.classList.add('is-selected');
	state.selectedItem = { blockId, columnIndex };
}


function setPreviewDevice(device) {
	state.previewDevice = device;
	document.querySelectorAll('.device-btn').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.device === device);
	});
	const icon = document.querySelector('.device-dropdown-icon');
	if (icon) {
		icon.className = `${device === 'tablet' ? 'ri-tablet-line' : device === 'mobile' ? 'ri-cellphone-line' : 'ri-computer-line'} device-dropdown-icon`;
	}

	document.body.dataset.previewDevice = device;
	if (device === 'tablet') {
		canvasGrid.style.maxWidth = '768px';
	} else if (device === 'mobile') {
		canvasGrid.style.maxWidth = '380px';
	} else {
		canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	}
	renderCanvasPanelUI();
	initCanvasReactTab();
}

function updateCanvasWidth(value) {
	state.canvasWidth = value || '1241';
	document.body.dataset.canvasSize = state.canvasWidth;
	if (state.previewDevice === 'pc') canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	renderCanvasPanelUI();
	syncCanvasGuideSize();
}

function renderCanvasPanelUI() {
	const canvasSizeControl = document.getElementById('canvasSizeControl');
	if (!canvasSizeControl) return;
	const isDevicePreview = state.previewDevice !== 'pc';
	const sizes = ['1024', '1241', '1440'];
	canvasSizeControl.innerHTML = `
		<div class="canvas-size-select${isDevicePreview ? ' is-disabled' : ''}" data-canvas-size-menu>
			<button type="button" class="canvas-size-trigger" data-canvas-size-trigger${isDevicePreview ? ' disabled' : ''}>
				<span>캔버스 너비</span>
				<strong>${state.canvasWidth}px</strong>
				<i class="ri-arrow-down-s-line" aria-hidden="true"></i>
			</button>
			<div class="canvas-size-options" role="listbox" aria-label="캔버스 너비">
				${sizes.map(s => `
					<button type="button" class="canvas-size-option${state.canvasWidth === s ? ' is-active' : ''}" data-canvas-size-value="${s}" role="option" aria-selected="${state.canvasWidth === s}">
						<span>${s}px</span>
						<i class="ri-check-line" aria-hidden="true"></i>
					</button>`).join('')}
			</div>
			<p class="canvas-size-disabled-tip">태블릿·모바일 모드에서는 설정할 수 없습니다.</p>
		</div>`;
	if (isDevicePreview) return;
	const menu = canvasSizeControl.querySelector('[data-canvas-size-menu]');
	canvasSizeControl.querySelector('[data-canvas-size-trigger]')?.addEventListener('click', event => {
		event.stopPropagation();
		menu.classList.toggle('is-open');
	});
	canvasSizeControl.querySelectorAll('[data-canvas-size-value]').forEach(button => {
		button.addEventListener('click', event => {
			event.stopPropagation();
			menu.classList.remove('is-open');
			updateCanvasWidth(button.dataset.canvasSizeValue);
		});
	});
}


function updateBlockWidth(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	block.blockWidth = value;
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.style.width = value || '';
	updateMarkup();
}

function updateBlockMargin(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	block.marginBottom = Math.max(0, Number(value) || 0);
	const total = state.blocks.length;
	const isLast = state.blocks[total - 1]?.id === blockId;
	const effectiveMargin = (total <= 1 || isLast) ? 0 : block.marginBottom;
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.style.marginBottom = `${effectiveMargin}px`;
	updateMarkup();
}

function updateMixInnerMargin(outerBlockId, innerIdx, value) {
	const outerBlock = state.blocks.find(b => b.id === outerBlockId);
	if (!outerBlock || !Array.isArray(outerBlock.innerBlocks)) return;
	const innerBlock = outerBlock.innerBlocks[innerIdx];
	if (!innerBlock) return;
	pushHistoryGrouped();
	innerBlock.marginBottom = Math.max(0, Number(value) || 0);
	const section = document.querySelector(`.builder-block[data-block-id="${outerBlockId}"]`);
	const innerItem = section?.querySelector(`.mix-inner-item[data-mix-inner-idx="${innerIdx}"]`);
	if (innerItem) innerItem.style.marginBottom = `${innerBlock.marginBottom}px`;
	updateMarkup();
}

function _handleEditFieldPaste(event) {
	event.preventDefault();
	const text = event.clipboardData?.getData('text/plain') ?? '';
	document.execCommand('insertText', false, text);
}

// 더블클릭 편집 대상 필드(.term[data-edit-field] 등) 안에 캔버스 전용
// 추가/삭제 버튼(.principal-term-actions, .principal-bio-row-actions)이
// 함께 들어있는 경우, 그 버튼 마크업까지 통째로 편집·저장되지 않도록
// 제거한 사본의 innerHTML을 반환한다. 없으면 원본 그대로 반환한다.
function getCleanEditableFieldHtml(field) {
	const actionSelector = '.principal-term-actions, .principal-bio-row-actions, .principal-tyb-year-actions, .principal-tyb-content-actions';
	if (!field.querySelector?.(actionSelector)) return field.innerHTML;
	const clean = field.cloneNode(true);
	clean.querySelectorAll(actionSelector).forEach(el => el.remove());
	return clean.innerHTML;
}

function startTextEdit(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const field = event.currentTarget;
	if (field.dataset.editField === 'icon') return;
	if (field.dataset.editAttr) return;
	if (field.dataset.cellBlockZone) return;
	if (field.classList.contains('img') && field.querySelector('img')) return;
	event.stopPropagation();
	field._editOriginalHtml = getCleanEditableFieldHtml(field);
	field.setAttribute('contenteditable', 'true');
	field.focus();
	const range = document.createRange();
	range.selectNodeContents(field);
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
	field.addEventListener('blur', finishTextEdit, { once: true });
	field.addEventListener('keydown', handleEditKeydown);
	field.addEventListener('paste', _handleEditFieldPaste);
}

function startTabTextEdit(event) {
	if (document.body.classList.contains('preview-mode')) return;
	event.preventDefault();
	event.stopPropagation();
	const aEl = event.currentTarget;
	aEl._tabEditOriginal = aEl.textContent;
	aEl.setAttribute('contenteditable', 'true');
	aEl.focus();
	const range = document.createRange();
	range.selectNodeContents(aEl);
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
	aEl.addEventListener('blur', finishTabTextEdit, { once: true });
	aEl.addEventListener('keydown', _tabEditKeydown);
}

function _tabEditKeydown(event) {
	if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
	if (event.key === 'Escape') { event.preventDefault(); event.currentTarget._tabEditCancelled = true; event.currentTarget.blur(); }
}

function finishTabTextEdit(event) {
	const aEl = event.currentTarget;
	aEl.removeEventListener('keydown', _tabEditKeydown);
	aEl.removeAttribute('contenteditable');
	if (aEl._tabEditCancelled) { aEl._tabEditCancelled = false; return; }
	const blockId = aEl.dataset.tabBlockId;
	const idx = Number(aEl.dataset.tabItemIdx);
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.tabItems || !block.tabItems[idx]) return;
	const newText = aEl.textContent.trim();
	if (newText && newText !== aEl._tabEditOriginal) {
		pushHistory();
		block.tabItems[idx].text = newText;
		render();
	}
}

function handleEditKeydown(event) {
	if (event.key === 'Enter') {
		if (event.shiftKey) {
			event.preventDefault();
			event.currentTarget.blur();
		} else {
			event.preventDefault();
			const selection = window.getSelection();
			if (selection.rangeCount) {
				const range = selection.getRangeAt(0);
				range.deleteContents();
				const br = document.createElement('br');
				range.insertNode(br);
				range.setStartAfter(br);
				range.collapse(true);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
	}
	if (event.key === 'Escape') {
		event.preventDefault();
		event.currentTarget._editCancelled = true;
		render();
	}
}

function finishTextEdit(event) {
	if (_colorPickerOpen || _nlToolbarActive) {
		event.currentTarget.addEventListener('blur', finishTextEdit, { once: true });
		return;
	}
	const field = event.currentTarget;
	field.removeEventListener('keydown', handleEditKeydown);
	field.removeEventListener('paste', _handleEditFieldPaste);
	field.removeAttribute('contenteditable');
	if (field._editCancelled) return;
	const columnIndex = Number(field.dataset.columnIndex);
	// .term[data-edit-field] 등에 붙어있는 캔버스 전용 추가/삭제 버튼 마크업이
	// 저장값에 함께 박제되지 않도록 정리한 값을 사용한다.
	const html = getCleanEditableFieldHtml(field);
	const fieldName = field.dataset.editField;
	if (fieldName === 'tabPanelContent') {
		const block = resolveEditableBlockData(field.dataset.blockId);
		if (!block || templateCategories[block.type] !== 'tab' || !block.tabItems?.[columnIndex]) return;
		const originalHtml = field._editOriginalHtml ?? block.tabItems[columnIndex].content ?? '';
		if (html !== originalHtml) {
			pushHistory();
			block.tabItems[columnIndex].content = html;
		}
		render();
		return;
	}
	const targetItems = getEditTargetItems(field.dataset.blockId);
	if (!targetItems || !targetItems[columnIndex]) return;
	const originalHtml = field._editOriginalHtml ?? targetItems[columnIndex][fieldName] ?? '';
	if (html && html !== originalHtml) {
		pushHistory();
		targetItems[columnIndex][fieldName] = html;
		if (/^year\d+$/.test(fieldName) || /^timeline-year\d+$/.test(fieldName)) {
			const block = resolveEditableBlockData(field.dataset.blockId) || state.blocks.find(b => b.id === field.dataset.blockId);
			if (block && templateCategories[block.type] === 'history') {
				syncHistoryTypeAYearFields(block, targetItems[columnIndex], fieldName, html);
			}
		}
		// 역대교장 리스트에서 "몇 대 교장" 배지를 더블클릭으로 직접 고친 경우에도
		// syncPrincipalOrderNumbers()가 이후 렌더에서 위치 기준 번호로 되돌리지
		// 않도록 수동 수정 표시를 남긴다.
		if (/^order\d+$/.test(fieldName)) {
			const block = resolveEditableBlockData(field.dataset.blockId) || state.blocks.find(b => b.id === field.dataset.blockId);
			if (block && templateCategories[block.type] === 'principal') {
				targetItems[columnIndex][`orderManual${fieldName.replace(/^order/, '')}`] = true;
			}
		}
	}
	render();
}

function syncHistoryTypeAYearFields(block, item, fieldName, html) {
	const escapedBlockId = window.CSS?.escape ? CSS.escape(block.id) : String(block.id).replace(/"/g, '\\"');
	const histEl = document.querySelector(`.builder-block[data-block-id="${escapedBlockId}"] .history.tyA`);
	if (!histEl) return;
	const timelineSlides = getHistoryTypeATimelineNodes(histEl);
	if (/^year\d+$/.test(fieldName)) {
		const activeSlide = timelineSlides.find(slide => slide.classList.contains('swiper-slide-active'));
		const btn = activeSlide?.querySelector('[data-edit-field]');
		if (btn) item[btn.dataset.editField] = html;
		return;
	}
	const slide = timelineSlides.find(s => s.querySelector('[data-edit-field]')?.dataset.editField === fieldName);
	if (!slide || !slide.classList.contains('swiper-slide-active')) return;
	const centerField = histEl.querySelector('.year [data-edit-field]');
	if (centerField) item[centerField.dataset.editField] = html;
}

// --- Inline block insertion helpers ---
let _inlineCaretEl = null;
let _pendingSmartInline = null;
let _lastInlineCaretX = -1;
let _lastInlineCaretY = -1;

function _getCaretRange(x, y) {
	if (document.caretRangeFromPoint) {
		return document.caretRangeFromPoint(x, y);
	}
	if (document.caretPositionFromPoint) {
		const pos = document.caretPositionFromPoint(x, y);
		if (pos) {
			const r = document.createRange();
			r.setStart(pos.offsetNode, pos.offset);
			r.collapse(true);
			return r;
		}
	}
	return null;
}

function _positionInlineCaretEl(left, top, height) {
	if (!_inlineCaretEl) {
		_inlineCaretEl = document.createElement('div');
		_inlineCaretEl.className = 'inline-drop-caret';
		document.body.appendChild(_inlineCaretEl);
	}
	_inlineCaretEl.style.left = `${left}px`;
	_inlineCaretEl.style.top = `${top}px`;
	_inlineCaretEl.style.height = `${height || 18}px`;
}

function _showInlineCaret(x, y) {
	const field = document.elementFromPoint(x, y)?.closest('[data-edit-field]');
	if (!field || field.dataset.editField === 'icon') {
		_clearInlineCaret();
		return;
	}

	if (!field.classList.contains('inline-drop-active')) {
		document.querySelectorAll('.inline-drop-active').forEach(el => el.classList.remove('inline-drop-active'));
		field.classList.add('inline-drop-active');
	}

	if (Math.abs(x - _lastInlineCaretX) < 4 && Math.abs(y - _lastInlineCaretY) < 4) return;
	_lastInlineCaretX = x;
	_lastInlineCaretY = y;

	const range = _getCaretRange(x, y);
	if (!range || !field.contains(range.startContainer)) {
		const fr = field.getBoundingClientRect();
		_positionInlineCaretEl(fr.right, fr.top, fr.height);
		return;
	}

	const sentinel = document.createElement('span');
	sentinel.textContent = '\u200b';
	sentinel.style.cssText = 'display:inline;font-size:inherit;line-height:inherit;pointer-events:none;';
	range.insertNode(sentinel);
	const rect = sentinel.getBoundingClientRect();
	sentinel.remove();

	_positionInlineCaretEl(rect.left, rect.top, rect.height || 18);
}

function _clearInlineCaret() {
	if (_inlineCaretEl) {
		_inlineCaretEl.remove();
		_inlineCaretEl = null;
	}
	_lastInlineCaretX = -1;
	_lastInlineCaretY = -1;
	document.querySelectorAll('.inline-drop-active').forEach(el => el.classList.remove('inline-drop-active'));
}

function _insertInlineBlock(templateId, x, y) {
	const template = componentTemplates[templateId];
	if ((!template?.isInline && !template?.isSmartInline) || !template.inlineHtml) return;

	const field = document.elementFromPoint(x, y)?.closest('[data-edit-field]');
	if (!field || field.dataset.editField === 'icon') return;

	let range = _getCaretRange(x, y);
	if (!range || !field.contains(range.startContainer)) {
		range = document.createRange();
		range.selectNodeContents(field);
		range.collapse(false);
	}

	range.deleteContents();
	const fragment = range.createContextualFragment(template.inlineHtml);
	range.insertNode(fragment);

	const blockId = field.dataset.blockId;
	const columnIndex = Number(field.dataset.columnIndex);
	const fieldName = field.dataset.editField;

	const targetItems = getEditTargetItems(blockId);

	if (!targetItems || !targetItems[columnIndex]) return;

	pushHistory();
	targetItems[columnIndex][fieldName] = field.innerHTML;
	render();
}
// --- End inline block insertion helpers ---


function _showSmartInlinePopup(templateId, x, y) {
	const template = componentTemplates[templateId];
	if (!template?.isSmartInline || !template.inlineHtml) return;

	const field = document.elementFromPoint(x, y)?.closest('[data-edit-field]');
	if (!field || field.dataset.editField === 'icon') return;

	let range = _getCaretRange(x, y);
	if (!range || !field.contains(range.startContainer)) {
		range = document.createRange();
		range.selectNodeContents(field);
		range.collapse(false);
	}

	range.deleteContents();
	const placeholder = document.createElement('span');
	placeholder.id = 'smart-inline-placeholder';
	range.insertNode(placeholder);

	_pendingSmartInline = {
		templateId,
		fieldBlockId: field.dataset.blockId,
		fieldName: field.dataset.editField,
		columnIndex: Number(field.dataset.columnIndex)
	};

	const linkSection = document.getElementById('inlinePropLinkSection');
	const downloadSection = document.getElementById('inlinePropDownloadSection');
	const defaultTextMap = { 'text-03': '링크', 'text-04': '다운로드' };
	document.getElementById('inlinePropText').value = defaultTextMap[templateId] || '';

	if (templateId === 'text-03') {
		linkSection.style.display = '';
		downloadSection.style.display = 'none';
		document.getElementById('inlinePropHref').value = '';
		document.getElementById('inlinePropTarget').value = '_blank';
	} else {
		linkSection.style.display = 'none';
		downloadSection.style.display = '';
	}

	const popup = document.getElementById('inlinePropPopup');
	popup.classList.add('is-open');
	const popRect = popup.getBoundingClientRect();
	let left = x + 14;
	let top = y + 14;
	if (left + popRect.width > window.innerWidth - 8) left = x - popRect.width - 14;
	if (top + popRect.height > window.innerHeight - 8) top = y - popRect.height - 14;
	popup.style.left = `${Math.max(8, left)}px`;
	popup.style.top = `${Math.max(8, top)}px`;

	requestAnimationFrame(() => {
		const textEl = document.getElementById('inlinePropText');
		if (textEl) { textEl.focus(); textEl.select(); }
	});
}

function _confirmSmartInline() {
	if (!_pendingSmartInline) return;
	const { templateId, fieldBlockId, fieldName, columnIndex } = _pendingSmartInline;

	const placeholder = document.getElementById('smart-inline-placeholder');
	if (!placeholder) { _cancelSmartInline(); return; }
	const field = placeholder.closest('[data-edit-field]');
	if (!field) { _cancelSmartInline(); return; }

	const template = componentTemplates[templateId];
	const temp = document.createElement('div');
	temp.innerHTML = template.inlineHtml;
	const aEl = temp.querySelector('a');
	if (aEl) {
		aEl.setAttribute('contenteditable', 'false');

		const textValue = document.getElementById('inlinePropText')?.value.trim();
		if (textValue) {
			for (const node of Array.from(aEl.childNodes)) {
				if (node.nodeType === Node.TEXT_NODE) {
					node.textContent = textValue;
					break;
				}
			}
		}

		if (templateId === 'text-03') {
			const href = document.getElementById('inlinePropHref')?.value.trim() || '';
			const target = document.getElementById('inlinePropTarget')?.value || '_blank';
			if (href) aEl.setAttribute('href', href);
			aEl.setAttribute('target', target);
			if (target === '_blank') {
				aEl.setAttribute('title', '?덉갹');
			} else {
				aEl.removeAttribute('title');
			}
		}
	}

	const insertRange = document.createRange();
	insertRange.selectNode(placeholder);
	const fragment = insertRange.createContextualFragment(temp.innerHTML);
	placeholder.replaceWith(fragment);

	const targetItems = getEditTargetItems(fieldBlockId);

	if (targetItems?.[columnIndex]) {
		pushHistory();
		targetItems[columnIndex][fieldName] = field.innerHTML;
		_closeSmartInlinePopup();
		render();
	} else {
		_cancelSmartInline();
	}
}

function _cancelSmartInline() {
	const placeholder = document.getElementById('smart-inline-placeholder');
	if (placeholder) placeholder.remove();
	_closeSmartInlinePopup();
}

function _closeSmartInlinePopup() {
	_pendingSmartInline = null;
	document.getElementById('inlinePropPopup')?.classList.remove('is-open');
}

function initSmartInlinePopup() {
	document.getElementById('inlinePropConfirm')?.addEventListener('click', _confirmSmartInline);
	document.getElementById('inlinePropCancel')?.addEventListener('click', _cancelSmartInline);

	['inlinePropText', 'inlinePropHref'].forEach(id => {
		document.getElementById(id)?.addEventListener('keydown', e => {
			if (e.key === 'Enter') { e.preventDefault(); _confirmSmartInline(); }
			if (e.key === 'Escape') { e.preventDefault(); _cancelSmartInline(); }
		});
	});

	document.addEventListener('mousedown', e => {
		const popup = document.getElementById('inlinePropPopup');
		if (popup?.classList.contains('is-open') && !popup.contains(e.target)) {
			_cancelSmartInline();
		}
	});
}


function handleCanvasDragOver(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload;
	if (payload.startsWith('new-inline:')) {
		const field = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-edit-field]');
		if (field && field.dataset.editField !== 'icon') {
			event.preventDefault();
			event.dataTransfer.dropEffect = 'copy';
			_showInlineCaret(event.clientX, event.clientY);
		}
		return;
	}
	if (payload.startsWith('new-smart:')) {
		const field = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-edit-field]');
		if (field && field.dataset.editField !== 'icon') {
			event.preventDefault();
			event.dataTransfer.dropEffect = 'copy';
			_showInlineCaret(event.clientX, event.clientY);
		} else {
			event.preventDefault();
			_clearInlineCaret();
			canvasGrid.classList.add('is-over');
		}
		return;
	}
	if (payload.startsWith('overlay-type:')) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		document.getElementById('canvasWrapper')?.classList.add('is-decoration-over');
		return;
	}
	if (payload.startsWith('new-block:') || payload.startsWith('new-design-template:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:')) {
		event.preventDefault();
		canvasGrid.classList.add('is-over');
	}
}

function handleCanvasDrop(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
	if (!payload) return;
	if (payload.startsWith('new-inline:')) {
		event.preventDefault();
		event.stopPropagation();
		state.dragPayload = '';
		_insertInlineBlock(payload.replace('new-inline:', ''), event.clientX, event.clientY);
		_clearInlineCaret();
		return;
	}
	if (payload.startsWith('new-smart:')) {
		event.preventDefault();
		event.stopPropagation();
		const type = payload.replace('new-smart:', '');
		state.dragPayload = '';
		const field = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-edit-field]');
		if (field && field.dataset.editField !== 'icon') {
			_clearInlineCaret();
			_showSmartInlinePopup(type, event.clientX, event.clientY);
		} else {
			clearDropIndicators();
			const targetBlock = event.target.closest('.builder-block');
			const position = targetBlock ? targetBlock.dataset.dropPosition || 'after' : 'after';
			addBlock(type, targetBlock ? targetBlock.dataset.blockId : null, position);
		}
		return;
	}
	clearDropIndicators();
	state.dragPayload = '';
	if (payload.startsWith('overlay-type:')) {
		event.preventDefault();
		event.stopPropagation();
		document.getElementById('canvasWrapper')?.classList.remove('is-decoration-over');
		const grid = document.getElementById('canvasGrid');
		if (grid) {
			const gRect = grid.getBoundingClientRect();
			addOverlay(payload.replace('overlay-type:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
		}
		return;
	}
	const targetBlock = event.target.closest('.builder-block');
	const position = targetBlock ? targetBlock.dataset.dropPosition || 'after' : 'after';
	if (payload.startsWith('new-block:')) {
		event.preventDefault();
		event.stopPropagation();
		addBlock(payload.replace('new-block:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
		return;
	}
	if (payload.startsWith('new-design-template:')) {
		event.preventDefault();
		event.stopPropagation();
		addDesignTemplate(payload.replace('new-design-template:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
		return;
	}
	if (payload.startsWith('existing-block:')) {
		event.preventDefault();
		event.stopPropagation();
		moveBlock(payload.replace('existing-block:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
		return;
	}
	if (payload.startsWith('copy-block:')) {
		event.preventDefault();
		event.stopPropagation();
		duplicateBlockAt(payload.replace('copy-block:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
	}
}

function handleBlockDrop(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
	if (!payload) return;

	if (event.target.closest('.nl-body-block-wrap')) return;

	const templateSlotField = event.target.closest('[data-edit-field]');
	if (
		templateSlotField &&
		templateSlotField.dataset.editField !== 'icon' &&
		(payload.startsWith('new-block:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:'))
	) {
		const parentBlockId = templateSlotField.dataset.blockId || event.currentTarget.dataset.blockId;
		if (parentBlockId) {
			const parentBlock = state.blocks.find(b => b.id === parentBlockId);
			if (templateSlotField.dataset.editField === 'body' && componentTemplates[parentBlock?.type]?.initialBodyBlocks?.length > 0) {
				// Existing newsletter/body templates use the dedicated body insertion path below.
			} else {
				event.preventDefault();
				event.stopPropagation();
				templateSlotField.classList.remove('mix-slot-over');
				clearDropIndicators();
				state.dragPayload = '';
				insertBlockIntoTemplateField(parentBlockId, templateSlotField.dataset.editField, payload);
				return;
			}
		}
	}

	// Drop normal blocks into a newsletter body area.
	const bodyArea = event.target.closest("[data-edit-field='body']");
	if (bodyArea) {
		const isNew = payload.startsWith('new-block:');
		const isExisting = payload.startsWith('existing-block:');
		if (isNew || isExisting) {
			event.preventDefault();
			event.stopPropagation();
			bodyArea.classList.remove('nl-body-drop-over');
			clearDropIndicators();
			state.dragPayload = '';
			const sectionBlockId = event.currentTarget.dataset.blockId;
			if (!state.blocks.find(b => b.id === sectionBlockId)) return;
			pushHistory();
			if (isExisting) {
				const existingBlock = state.blocks.find(b => b.id === payload.replace('existing-block:', ''));
				if (!existingBlock) return;
				existingBlock._isNlBodyBlock = true;
				existingBlock._parentSectionId = sectionBlockId;
			} else {
				const type = payload.replace('new-block:', '');
				if (!componentTemplates[type]) return;
				const bodyBlock = createBlock(type);
				bodyBlock._isNlBodyBlock = true;
				bodyBlock._parentSectionId = sectionBlockId;
				bodyBlock.marginBottom = 0;
				state.blocks.push(bodyBlock);
			}
			render();
			return;
		}
	}

	if (payload.startsWith('new-inline:')) {
		event.preventDefault();
		event.stopPropagation();
		state.dragPayload = '';
		_insertInlineBlock(payload.replace('new-inline:', ''), event.clientX, event.clientY);
		_clearInlineCaret();
		return;
	}
	if (payload.startsWith('new-smart:')) {
		const type = payload.replace('new-smart:', '');
		const field = event.target.closest('[data-edit-field]');
		if (field && field.dataset.editField !== 'icon') {
			event.preventDefault();
			event.stopPropagation();
			state.dragPayload = '';
			_clearInlineCaret();
			_showSmartInlinePopup(type, event.clientX, event.clientY);
		} else {
			event.preventDefault();
			event.stopPropagation();
			const targetBlockId = event.currentTarget.dataset.blockId;
			const position = event.currentTarget.dataset.dropPosition || 'after';
			clearDropIndicators();
			state.dragPayload = '';
			addBlock(type, targetBlockId, position);
		}
		return;
	}
	if (!payload.startsWith('new-block:') && !payload.startsWith('new-design-template:') && !payload.startsWith('existing-block:') && !payload.startsWith('copy-block:')) return;
	event.preventDefault();
	event.stopPropagation();
	const targetBlockId = event.currentTarget.dataset.blockId;
	const position = event.currentTarget.dataset.dropPosition || 'after';
	clearDropIndicators();
	state.dragPayload = '';

	if (position === 'inside-title') {
		const targetBlockData = state.blocks.find(b => b.id === targetBlockId);
		if (targetBlockData && isTitleBlock(targetBlockData.type)) {
			const demotedType = demoteTitleType(targetBlockData.type);
			if (demotedType) {
				convertAndInsertTitleBlock(payload, targetBlockId, demotedType);
				return;
			}
		}
	}

	if (payload.startsWith('new-block:')) {
		addBlock(payload.replace('new-block:', ''), targetBlockId, position);
		return;
	}
	if (payload.startsWith('new-design-template:')) {
		addDesignTemplate(payload.replace('new-design-template:', ''), targetBlockId, position);
		return;
	}
	if (payload.startsWith('copy-block:')) {
		duplicateBlockAt(payload.replace('copy-block:', ''), targetBlockId, position);
		return;
	}
	moveBlock(payload.replace('existing-block:', ''), targetBlockId, position);
}

function updateMarkup() {
	_lastFullMarkup = generateMarkup();
	if (_markupTabs) _markupTabs.refresh();
	else markupOutput.value = _lastFullMarkup;
}

function generateMarkup() {
	if (!state.blocks.length && !state.overlays.length) return '<!-- 디자인 블록을 추가하면 마크업이 생성됩니다. -->';
	const { html: blocksHtml, cssRules } = state.blocks.length ? _generateBlocksMarkup() : { html: '', cssRules: [] };

	const indentBlocks = blocksHtml.split('\n').map(l => `  ${l}`).join('\n');

	const themeAttr = document.body.dataset.theme ? ` data-theme="${document.body.dataset.theme}"` : '';
	if (!state.overlays.length) {
		const styleBlock = cssRules.length ? `<style>\n${cssRules.join('\n\n')}\n</style>` : '';
		const gridHtml = `<div${themeAttr}>\n${indentBlocks}\n</div>`;
		return styleBlock ? `${styleBlock}\n\n${gridHtml}` : gridHtml;
	}
	cssRules.push(`@media (max-width: 768px) {\n  .sub-content-decoration {\n    display: none !important;\n  }\n}`);
	const overlaysMarkup = state.overlays.map(ov => {
		const template = componentTemplates[ov.type];
		if (!template) return '';
		const lines = template.markup(ov.data || {});
		const inner = lines.map(l => `    ${l}`).join('\n');
		return `  <div class="sub-content-decoration" style="position:absolute;top:${ov.y}px;left:${ov.x}px;">\n${inner}\n  </div>`;
	}).join('\n');
	const gridWithOverlay = `<div${themeAttr} style="position:relative;">\n${indentBlocks}\n${overlaysMarkup}\n</div>`;
	const styleBlock = `<style>\n${cssRules.join('\n\n')}\n</style>`;
	return styleBlock ? `${styleBlock}\n\n${gridWithOverlay}` : gridWithOverlay;
}

function _buildStyleRule(selector, vars) {
	const declarations = vars.split(';').map(s => s.trim()).filter(Boolean);
	return `${selector} {\n  ${declarations.join(';\n  ')};\n}`;
}

function _templateRootClass(template) {
	return template.element.classList[0] || template.id;
}

function _extractInnerVarStyles(el, baseSelector, cssRules) {
	el.querySelectorAll('[style]').forEach(inner => {
		const style = inner.getAttribute('style') || '';
		if (!style.includes('--')) return;
		const cls = Array.from(inner.classList)
			.find(c => !['inner', 'block-item', 'list-wrap-inner', 'template-title', 'template-body'].includes(c));
		if (!cls) return;
		cssRules.push(_buildStyleRule(`${baseSelector} .${cls}`, style));
		inner.removeAttribute('style');
	});
}

function _elementMarkup(el) {
	return elementToHtml(el);
}

function _unwrapIfBare(el) {
	if (el.attributes.length === 0) return el.innerHTML.trim();
	return elementToHtml(el);
}

function _stripCssVars(el) {
	const strip = node => {
		const style = node.getAttribute('style');
		if (!style || !style.includes('--')) return;
		const cleaned = style.replace(/--[\w-]+\s*:[^;]+;?\s*/g, '').trim().replace(/;$/, '');
		if (cleaned) node.setAttribute('style', cleaned);
		else node.removeAttribute('style');
	};
	strip(el);
	el.querySelectorAll('[style]').forEach(strip);
}

function _prettyHtml(html) {
	const INDENT = '  ';
	const VOID = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s>/]/i;
	let level = 0;
	return html
		.replace(/>\s*</g, '>\n<')
		.split('\n')
		.map(s => s.trim())
		.filter(Boolean)
		.map(line => {
			if (line.startsWith('</')) level = Math.max(0, level - 1);
			const out = INDENT.repeat(level) + line;
			if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !VOID.test(line) && !line.includes('</')) level++;
			return out;
		})
		.join('\n');
}

function _wrapIndentMarkup(innerHtml) {
	const indented = innerHtml.split('\n').map(l => `  ${l}`).join('\n');
	return `<div class="indent">\n${indented}\n</div>`;
}

function _wrapInSection(block, idx, total, innerHtml) {
	const effectiveMargin = (total <= 1 || idx === total - 1) ? 0 : (block.marginBottom ?? 10);
	const styleParts = [];
	if (block.marginTop) styleParts.push(`margin-top:${block.marginTop}px`);
	if (effectiveMargin) styleParts.push(`margin-bottom:${effectiveMargin}px`);
	if (block.marginLeft) styleParts.push(`margin-left:${block.marginLeft}px`);
	if (block.marginRight) styleParts.push(`margin-right:${block.marginRight}px`);
	const effectiveWidth = _calcEffectiveWidth(block.blockWidth, block.marginLeft, block.marginRight);
	if (effectiveWidth) {
		if (/^newsletter-\d+/.test(block.type)) {
			styleParts.push(`width:100%`);
			styleParts.push(`max-width:${effectiveWidth}`);
			styleParts.push(`margin-left:auto`);
			styleParts.push(`margin-right:auto`);
		} else {
			styleParts.push(`width:${effectiveWidth}`);
		}
	}
	const styleAttr = styleParts.length ? ` style="${styleParts.join(';')}"` : '';
	const sectionInnerHtml = block.blockIndent ? _wrapIndentMarkup(innerHtml) : innerHtml;
	const indented = sectionInnerHtml.split('\n').map(l => `  ${l}`).join('\n');
	return `<section${styleAttr}>\n${indented}\n</section>`;
}

function _cleanBlockItem(el) {
	el.querySelectorAll('.block-item').forEach(bi => bi.removeAttribute('style'));
	if (el.classList.contains('block-item')) el.removeAttribute('style');
}

function _generateBlocksMarkup() {
	const _sink = [];
	const visibleBlocks = state.blocks.filter(b => !b._isNlBodyBlock && !b._slotParentId);
	const total = visibleBlocks.length;
	const html = visibleBlocks.map((block, idx) => {
		const template = componentTemplates[block.type];
		if (!template) return '';

		if (template.isRootWrap) {
			const innerHtml = block.items.map((item, colIdx) => {
				const _tplRender = componentTemplates[block.type];
				const _hasBodyField = _tplRender?.initialBodyBlocks?.length > 0;
				const el = renderAddColumnWrapElement(template, item, block, colIdx, _hasBodyField);
				if (/^newsletter-\d+__section_1$/.test(block.type)) {
					const logoImg = el.querySelector('img[data-nl-logo]');
					if (logoImg) {
						if (block.nlLogoSrc) {
							logoImg.setAttribute('src', block.nlLogoSrc);
							logoImg.setAttribute('alt', block.nlLogoAlt || '');
							logoImg.style.display = '';
						} else {
							logoImg.style.display = 'none';
						}
					}
				}
				if (_hasBodyField) stripEditorAttributes(el);
				if (_hasBodyField) {
					const contentArea = el.querySelector('[data-edit-field="body"]');
					if (contentArea) {
						const bodyBlocks = state.blocks.filter(b => b._isNlBodyBlock && b._parentSectionId === block.id);
						if (bodyBlocks.length > 0) {
							contentArea.innerHTML = '';
							bodyBlocks.forEach(bb => {
								const bbTemplate = componentTemplates[bb.type];
								if (!bbTemplate) return;
								const wrapper = document.createElement('div');
								wrapper.className = 'nl-block-insert nl-body-block-wrap';
								const gapPx = (bb.marginBottom !== undefined && bb.marginBottom !== null)
									? bb.marginBottom : (12);
								if (bb.marginTop) wrapper.style.marginTop = bb.marginTop + 'px';
								wrapper.style.marginBottom = gapPx + 'px';
								if (bb.marginLeft && bb.blockAlign !== 'ac') wrapper.style.marginLeft = bb.marginLeft + 'px';
								if (bb.marginRight && bb.blockAlign !== 'ac' && bb.blockAlign !== 'ar') wrapper.style.marginRight = bb.marginRight + 'px';
								const nlEffectiveWidth = _calcEffectiveWidth(bb.blockWidth, bb.blockAlign ? 0 : bb.marginLeft, bb.blockAlign ? 0 : bb.marginRight);
								if (nlEffectiveWidth) wrapper.style.width = nlEffectiveWidth;
								if (bb.blockAlign === 'ac') { wrapper.style.marginLeft = 'auto'; wrapper.style.marginRight = 'auto'; }
								else if (bb.blockAlign === 'ar') { wrapper.style.marginLeft = 'auto'; }
								if (bb.nlBodyZoom && bb.nlBodyZoom !== 100) wrapper.style.zoom = (bb.nlBodyZoom / 100).toString();
								if (bb.nlBodyFontWeight) wrapper.style.setProperty('--nl-body-font-weight', bb.nlBodyFontWeight);
								let bbHtml;
								if (bbTemplate.isRootWrap) {
									const bbRootEl = renderAddColumnWrapElement(bbTemplate, bb.items[0] || {}, bb, 0, false);
									stripEditorAttributes(bbRootEl);
									bbHtml = elementToHtml(bbRootEl);
								} else {
									bbHtml = _renderBlockExportHtml(bb);
								}
								wrapper.innerHTML = bb.blockIndent ? _wrapIndentMarkup(bbHtml) : bbHtml;
								contentArea.appendChild(wrapper);
							});
						}
					}
					el.querySelectorAll('[data-edit-field]').forEach(e => e.removeAttribute('data-edit-field'));
				}
				_extractInnerVarStyles(el, '.x', _sink);
				applyItemStyles(el, item, template);
				_stripCssVars(el);
				_cleanBlockItem(el);
				return _prettyHtml(_elementMarkup(el));
			}).join('\n\n');
			return _wrapInSection(block, idx, total, innerHtml);
		} else if (templateCategories[block.type] === 'table') {
			const item = block.items[0];
			const outer = renderTableDynamically(block, item, 0, false);
			if (outer.hasAttribute('style')) outer.removeAttribute('style');
			applyItemStyles(outer, item, template);
			_stripCssVars(outer);
			_cleanBlockItem(outer);
			return _wrapInSection(block, idx, total, _prettyHtml(_unwrapIfBare(outer)));
		} else if (templateCategories[block.type] === 'list' && block.items[0]?.rows) {
			const item = block.items[0];
			const outer = renderListDynamically(block, item, 0, template.element, false);
			if (outer.hasAttribute('style')) outer.removeAttribute('style');
			const listFirstChild = outer.firstElementChild;
			if (listFirstChild && block.blockAlign) {
				listFirstChild.classList.remove('al', 'ac', 'ar');
				listFirstChild.classList.add(block.blockAlign);
			}
			applyItemStyles(outer, item, template);
			_stripCssVars(outer);
			_cleanBlockItem(outer);
			return _wrapInSection(block, idx, total, _prettyHtml(_unwrapIfBare(outer)));
		} else {
			const outer = buildColumnBlock(template, block, false);
			if (outer.hasAttribute('style')) outer.removeAttribute('style');
			_extractInnerVarStyles(outer, '.x', _sink);
			applyItemStyles(outer, block.items[0] || {}, template);
			_stripCssVars(outer);
			_cleanBlockItem(outer);
			return _wrapInSection(block, idx, total, _prettyHtml(_unwrapIfBare(outer)));
		}
	}).join('\n\n');

	return { html, cssRules: [] };
}

// 오버레이 레이어 시스템

let _overlayNextId = 1;
let _overlayDrag = null;
let _overlayDragOffset = { x: 0, y: 0 };

function addOverlay(type, x, y) {
	const template = componentTemplates[type];
	if (!template) return;
	const data = template.getDefaultData ? template.getDefaultData() : {};
	state.overlays.push({ id: `ov-${_overlayNextId++}`, type, x: Math.round(x), y: Math.round(y), data });
	syncCanvasPresence();
	if (!state.blocks.length) render();
	renderOverlayItems();
	updateMarkup();
}

function removeOverlay(id) {
	state.overlays = state.overlays.filter(ov => ov.id !== id);
	syncCanvasPresence();
	if (!state.blocks.length) render();
	renderOverlayItems();
	updateMarkup();
}

function getGridOffset() {
	const grid = document.getElementById('canvasGrid');
	const wrapper = document.getElementById('canvasWrapper');
	if (!grid || !wrapper) return { x: 0, y: 0 };
	const gRect = grid.getBoundingClientRect();
	const wRect = wrapper.getBoundingClientRect();
	return { x: gRect.left - wRect.left, y: gRect.top - wRect.top + wrapper.scrollTop };
}

function renderOverlayItems() {
	const layer = document.getElementById('overlayLayer');
	if (!layer) return;
	const off = getGridOffset();
	if (document.body.classList.contains('preview-mode')) {
		layer.innerHTML = state.overlays.map(ov => {
			const template = componentTemplates[ov.type];
			if (!template) return '';
			const html = template.render({ id: ov.id }, ov.data || {}, 0, false);
			return `<div class="overlay-item" data-ov-id="${ov.id}" style="top:${ov.y + off.y}px;left:${ov.x + off.x}px;">${html}</div>`;
		}).join('');
		return;
	}
	layer.innerHTML = state.overlays.map(ov => {
		const template = componentTemplates[ov.type];
		if (!template) return '';
		const html = template.render({ id: ov.id }, ov.data || {}, 0, false);
		return `<div class="overlay-item is-editable" data-ov-id="${ov.id}"
			style="top:${ov.y + off.y}px;left:${ov.x + off.x}px;">
			<button type="button" class="overlay-remove-btn" data-ov-id="${ov.id}" aria-label="삭제">×</button>
			${html}</div>`;
	}).join('');
	bindOverlayItemEvents();
}

function bindOverlayItemEvents() {
	document.querySelectorAll('.overlay-remove-btn').forEach(btn => {
		btn.addEventListener('click', e => { e.stopPropagation(); removeOverlay(btn.dataset.ovId); });
	});
	document.querySelectorAll('.overlay-item.is-editable').forEach(item => {
		item.addEventListener('mousedown', onOverlayItemMouseDown);
	});
}

function onOverlayItemMouseDown(event) {
	if (event.target.closest('.overlay-remove-btn')) return;
	event.preventDefault();
	const item = event.currentTarget;
	_overlayDrag = state.overlays.find(ov => ov.id === item.dataset.ovId);
	if (!_overlayDrag) return;
	const itemRect = item.getBoundingClientRect();
	_overlayDragOffset = { x: event.clientX - itemRect.left, y: event.clientY - itemRect.top };
	document.addEventListener('mousemove', onOverlayMouseMove);
	document.addEventListener('mouseup', onOverlayMouseUp);
}

function onOverlayMouseMove(event) {
	if (!_overlayDrag) return;
	const grid = document.getElementById('canvasGrid');
	if (!grid) return;
	const gRect = grid.getBoundingClientRect();
	_overlayDrag.x = Math.round(event.clientX - gRect.left - _overlayDragOffset.x);
	_overlayDrag.y = Math.round(event.clientY - gRect.top - _overlayDragOffset.y);
	const off = getGridOffset();
	const item = document.querySelector(`.overlay-item[data-ov-id="${_overlayDrag.id}"]`);
	if (item) { item.style.left = (_overlayDrag.x + off.x) + 'px'; item.style.top = (_overlayDrag.y + off.y) + 'px'; }
}

function onOverlayMouseUp() {
	if (_overlayDrag) updateMarkup();
	_overlayDrag = null;
	document.removeEventListener('mousemove', onOverlayMouseMove);
	document.removeEventListener('mouseup', onOverlayMouseUp);
}

function toggleOverlayEdit() {
	const isNowEdit = document.body.classList.toggle('overlay-edit');
	const toggleBtn = document.getElementById('overlayEditToggle');
	if (toggleBtn) {
		toggleBtn.innerHTML = isNowEdit
			? '<i class="ri-magic-line" aria-hidden="true"></i> 꾸밈 편집 중'
			: '<i class="ri-magic-line" aria-hidden="true"></i> 꾸밈 편집';
	}
	renderOverlayItems();
}

function exitOverlayEdit() {
	if (!document.body.classList.contains('overlay-edit')) return;
	document.body.classList.remove('overlay-edit');
	const toggleBtn = document.getElementById('overlayEditToggle');
	if (toggleBtn) toggleBtn.innerHTML = '<i class="ri-magic-line" aria-hidden="true"></i> 꾸밈 편집';
	renderOverlayItems();
}

function populateOverlayDrawer() {
	const list = document.getElementById('overlayDrawerList');
	if (!list) return;
	const decorations = Object.values(componentTemplates).filter(t =>
		(templateCategories[t.id] || '') === 'decoration'
	);
	if (!decorations.length) {
		list.innerHTML = '<p class="overlay-drawer-empty">등록된 꾸밈 요소가 없습니다.</p>';
		return;
	}
	list.innerHTML = decorations.map(t => `
		<div class="overlay-drawer-item" draggable="true" data-overlay-type="${t.id}"></div>`).join('');

	decorations.forEach(async t => {
		const item = list.querySelector(`[data-overlay-type="${t.id}"]`);
		if (!item) return;
		item.innerHTML = `<img src="${escapeAttr(getThumbUrl(t.id))}" alt="${escapeAttr(t.name || t.id)}">`;
	});

	list.querySelectorAll('.overlay-drawer-item').forEach(item => {
		item.addEventListener('dragstart', event => {
			state.dragPayload = 'overlay-type:' + item.dataset.overlayType;
			event.dataTransfer.effectAllowed = 'copy';
		});
	});
}

function initCompactHeader() {
	const sentinel = document.getElementById('headerSentinel');
	const topbar = document.querySelector('.topbar');
	if (!sentinel || !topbar) return;

	const updateHeaderHeight = () => {
		document.documentElement.style.setProperty('--header-h', topbar.offsetHeight + 'px');
	};
	new ResizeObserver(updateHeaderHeight).observe(topbar);
	updateHeaderHeight();

	new IntersectionObserver(([entry]) => {
		if (document.body.classList.contains('preview-mode')) return;
		const compact = !entry.isIntersecting;
		document.body.classList.toggle('header-compact', compact);
	}, { threshold: 0 }).observe(sentinel);
}

function initResponsiveTopbarMenu() {
	const actions = document.querySelector('.topbar-actions');
	const status = document.getElementById('layoutStatus');
	if (!actions || !status || document.getElementById('topbarMenu')) return;

	const menuButton = document.createElement('button');
	menuButton.type = 'button';
	menuButton.className = 'topbar-menu-toggle';
	menuButton.id = 'topbarMenuToggle';
	menuButton.setAttribute('aria-label', '메뉴 열기');
	menuButton.setAttribute('aria-expanded', 'false');
	menuButton.setAttribute('aria-controls', 'topbarMenu');
	menuButton.innerHTML = '<i class="ri-menu-line" aria-hidden="true"></i>';

	const menu = document.createElement('div');
	menu.className = 'topbar-menu';
	menu.id = 'topbarMenu';

	const movableNodes = [];
	let node = status.nextSibling;
	while (node) {
		const next = node.nextSibling;
		movableNodes.push(node);
		node = next;
	}

	status.after(menuButton);
	menuButton.after(menu);
	movableNodes.forEach(item => menu.appendChild(item));

	function closeMenu() {
		actions.classList.remove('is-menu-open');
		menuButton.setAttribute('aria-expanded', 'false');
	}

	menuButton.addEventListener('click', event => {
		event.stopPropagation();
		const isOpen = actions.classList.toggle('is-menu-open');
		menuButton.setAttribute('aria-expanded', String(isOpen));
	});

	document.addEventListener('click', event => {
		if (!actions.classList.contains('is-menu-open')) return;
		if (event.target.closest('.topbar-actions')) return;
		closeMenu();
	});

	document.addEventListener('keydown', event => {
		if (event.key === 'Escape') closeMenu();
	});
}

function initOverlayLayer() {
	const layer = document.getElementById('overlayLayer');
	const wrapper = document.getElementById('canvasWrapper');
	if (!layer || !wrapper) return;

	layer.addEventListener('dragover', event => {
		if (!state.dragPayload.startsWith('overlay-type:')) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	});

	layer.addEventListener('drop', event => {
		const payload = state.dragPayload;
		if (!payload.startsWith('overlay-type:')) return;
		event.preventDefault();
		const grid = document.getElementById('canvasGrid');
		if (grid) {
			const gRect = grid.getBoundingClientRect();
			addOverlay(payload.replace('overlay-type:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
		}
		state.dragPayload = '';
	});
}

function copyMarkup() {
	const text = markupOutput.value;
	copyState.textContent = '';
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(text).then(showCopySuccess).catch(copyFallback);
		return;
	}
	copyFallback();
}

function copyFallback() {
	markupOutput.focus();
	markupOutput.select();
	document.execCommand('copy');
	showCopySuccess();
}

function showCopySuccess() {
	copyState.textContent = '마크업을 클립보드에 복사했습니다.';
	window.setTimeout(() => {
		copyState.textContent = '';
	}, 2200);
}

function openMarkup() {
	updateMarkup();
	document.body.classList.add('markup-open');
	markupToggle.setAttribute('aria-expanded', 'true');
}

function closeMarkup() {
	document.body.classList.remove('markup-open');
	markupToggle.setAttribute('aria-expanded', 'false');
}

function toggleMarkupPanel() {
	document.body.classList.contains('markup-open') ? closeMarkup() : openMarkup();
}

function togglePreview() {
	const isPreview = document.body.classList.toggle('preview-mode');
	previewToggle.setAttribute('aria-pressed', String(isPreview));
	previewToggle.innerHTML = isPreview
		? '<i class="ri-edit-line" aria-hidden="true"></i> 편집하기'
		: '<i class="ri-eye-line" aria-hidden="true"></i> 미리보기';
	const toolbar = document.getElementById('textFormatToolbar');
	if (toolbar) toolbar.hidden = true;
	if (isPreview) {
		exitCompactHeader();
		renderOverlayItems();
		document.querySelectorAll('[contenteditable="true"]').forEach(el => {
			el.setAttribute('contenteditable', 'false');
			el.dataset.wasEditable = '1';
		});
	} else {
		renderOverlayItems();
		document.querySelectorAll('[data-was-editable]').forEach(el => {
			el.setAttribute('contenteditable', 'true');
			delete el.dataset.wasEditable;
		});
	}
	render();
}

function exitCompactHeader() {
	if (!document.body.classList.contains('header-compact')) return;
	document.body.classList.remove('header-compact');
}

function returnToCanvas() {
	if (!document.body.classList.contains('preview-mode')) return;
	exitOverlayEdit();
	togglePreview();
}

function openMarkupFromPreview() {
	openMarkup();
}

function collectStylesheetText() {
	return Array.from(document.styleSheets).map(sheet => {
		try {
			return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
		} catch (error) {
			return '';
		}
	}).join('\n');
}

function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function createProjectSnapshot() {
	return {
		schemaVersion: 1,
		app: 'klic-content-builder',
		savedAt: new Date().toISOString(),
		blocks: cloneData(state.blocks),
		overlays: cloneData(state.overlays),
		templateVars: cloneData(state.templateVars || {}),
		previewDevice: state.previewDevice || 'pc',
		theme: document.body.dataset.theme || '',
		generatedMarkup: generateMarkup()
	};
}

function restoreProjectSnapshot(snapshot) {
	if (!snapshot || !Array.isArray(snapshot.blocks)) {
		throw new Error('Invalid project JSON');
	}
	pushHistory();
	state.blocks = cloneData(snapshot.blocks);
	state.overlays = cloneData(snapshot.overlays || []);
	state.templateVars = cloneData(snapshot.templateVars || {});
	state.previewDevice = snapshot.previewDevice || snapshot.canvas?.previewDevice || 'pc';
	state.selectedItem = null;
	state.dragPayload = '';
	state.nextBlockId = state.blocks.reduce((max, block) => {
		const n = parseInt(String(block.id || '').replace('block-', ''), 10);
		return Number.isNaN(n) ? max : Math.max(max, n + 1);
	}, 1);
	setPreviewDevice(state.previewDevice);
	if (snapshot.theme) applyTheme(snapshot.theme);
	renderOverlayItems();
	render();
}

function downloadProjectKlic(snapshot, name = 'content') {
	const safeName = String(name || 'content').trim() || 'content';
	const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
	downloadBlob(blob, `${safeName}.klic`);
}

function downloadProjectJson(snapshot, name = 'content') {
	const safeName = String(name || 'content').trim() || 'content';
	const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
	downloadBlob(blob, `${safeName}.json`);
}

async function saveProjectJson() {
	if (!state.blocks.length) { alert('저장할 콘텐츠가 없습니다.'); return; }
	const btn = saveProjectJsonButton;
	if (btn) btn.disabled = true;
	try {
		const snapshot = createProjectSnapshot();
		const response = await fetch('/save-project', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(snapshot)
		});
		if (!response.ok) throw new Error(`Save failed: ${response.status}`);
		const result = await response.json();
		alert(`JSON 저장 완료\n${result.path || result.id || ''}`);
	} catch (error) {
		console.warn('[save-project] 서버 저장 실패, 파일 다운로드로 전환합니다.', error);
		downloadProjectJson(createProjectSnapshot(), `content_${Date.now()}`);
		alert('서버 저장 경로가 없어 JSON 파일로 다운로드했습니다.');
	} finally {
		if (btn) btn.disabled = false;
	}
}

async function loadProjectKlicFile(file) {
	if (!file) return;
	const text = await file.text();
	restoreProjectSnapshot(JSON.parse(text));
}

function openFileSaveModal() {
	if (!state.blocks.length) { alert('저장할 콘텐츠가 없습니다.'); return; }
	const today = new Date();
	const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
	document.getElementById('saveFileNameInput').value = `content_${dateStr}`;
	const htmlRadio = document.querySelector('input[name="saveFileFormat"][value="html"]');
	if (htmlRadio) htmlRadio.checked = true;
	const klicRadio = document.querySelector('input[name="saveFileFormat"][value="klic"]');
	if (klicRadio) klicRadio.checked = true;
	document.getElementById('saveFileModal').hidden = false;
	setTimeout(() => {
		const input = document.getElementById('saveFileNameInput');
		if (input) { input.focus(); input.select(); }
	}, 50);
}

function closeFileSaveModal() {
	document.getElementById('saveFileModal').hidden = true;
}

async function _fetchContentCss() {
	const reset = `*,*::before,*::after{box-sizing:border-box}
body,h1,h2,h3,h4,h5,h6,p,ul,ol,li,dl,dt,dd,figure,figcaption,blockquote{margin:0;padding:0}
ul,ol,li{list-style:none}
a{color:inherit;text-decoration:none}
img,svg{display:block;max-width:100%}
table{border-collapse:collapse;border-spacing:0}
caption,legend{position:absolute;margin:-1px;padding:0;width:1px;height:1px;border:0;clip:rect(0,0,0,0);overflow:hidden;}`;

	const files = ['/00_common/css/basic.css', '/00_common/css/theme.css', '/00_common/css/con_com.css'];
	const results = await Promise.all(
		files.map(url => fetch(url).then(r => r.ok ? r.text() : '').catch(() => ''))
	);
	return [reset, ...results.filter(Boolean)].join('\n\n');
}

function _cssColorToHex(cssColor) {
	const m = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (!m) return '000000';
	return [1, 2, 3].map(i => parseInt(m[i]).toString(16).padStart(2, '0')).join('');
}

function _cloneWithInlineStyles(rootEl) {
	const PROPS = [
		'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
		'color', 'background-color',
		'text-align', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing',
		'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
		'margin-top', 'margin-bottom',
		'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
	];
	const SKIP_VALUES = new Set(['rgba(0, 0, 0, 0)', 'normal', 'auto', 'none', '0px', 'initial', 'inherit', 'nowrap']);

	const allSrc = [rootEl, ...Array.from(rootEl.querySelectorAll('*'))];
	const inlineStyles = allSrc.map(el => {
		const cs = getComputedStyle(el);
		return PROPS.map(p => {
			const v = cs.getPropertyValue(p).trim();
			if (!v || SKIP_VALUES.has(v)) return null;
			return `${p}:${v}`;
		}).filter(Boolean).join(';');
	});

	const clone = rootEl.cloneNode(true);
	const allClone = [clone, ...Array.from(clone.querySelectorAll('*'))];
	inlineStyles.forEach((style, i) => { if (style) allClone[i].setAttribute('style', style); });

	clone.setAttribute('style', 'display:block;width:100%;margin:0;padding:0;background:white;box-sizing:border-box;');

	// Convert multi-column containers to full-width blocks for Word export.
	clone.querySelectorAll('.builder-columns, .builder-rows').forEach(el => {
		const existing = el.getAttribute('style') || '';
		el.setAttribute('style', existing + ';display:block;width:100%;');
	});

	clone.querySelectorAll('.block-controls, .drag-handle, .column-copy-label, .column-options, .block-add-btn, .block-toolbar').forEach(el => el.remove());

	return clone;
}

// Build DOC body in a hidden iframe so computed styles can be inlined.
async function _buildDocBody(markup) {
	const css = await _fetchContentCss();

	return new Promise((resolve) => {
		const iframe = document.createElement('iframe');
		iframe.setAttribute('aria-hidden', 'true');
		iframe.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:1241px;height:10000px;visibility:hidden;border:none;pointer-events:none;';
		document.body.appendChild(iframe);

		const iDoc = iframe.contentDocument;
		const iWin = iframe.contentWindow;

		iDoc.open();
		iDoc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:0;background:white;}${css}</style></head><body>${markup}</body></html>`);
		iDoc.close();

		const PROPS = [
			'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
			'color', 'background-color',
			'text-align', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing',
			'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
			'margin-top', 'margin-bottom',
			'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
		];
		const SKIP = new Set(['rgba(0, 0, 0, 0)', 'normal', 'auto', 'none', '0px', 'initial', 'inherit', 'nowrap']);

		const doWork = () => {
			try {
				const rootEl = iDoc.querySelector('.canvas-grid');
				if (!rootEl) { resolve(markup); return; }

				const allSrc = [rootEl, ...Array.from(rootEl.querySelectorAll('*'))];
				const inlineStyles = allSrc.map(el => {
					const cs = iWin.getComputedStyle(el);
					return PROPS.map(p => {
						const v = cs.getPropertyValue(p).trim();
						if (!v || SKIP.has(v)) return null;
						return `${p}:${v}`;
					}).filter(Boolean).join(';');
				});

				const clone = rootEl.cloneNode(true);
				const allClone = [clone, ...Array.from(clone.querySelectorAll('*'))];
				inlineStyles.forEach((style, i) => { if (style) allClone[i].setAttribute('style', style); });

				clone.setAttribute('style', 'display:block;width:100%;margin:0;padding:0;background:white;box-sizing:border-box;');

				clone.querySelectorAll('.builder-columns').forEach(colContainer => {
					const cols = Array.from(colContainer.children);
					if (!cols.length) return;
					const table = iDoc.createElement('table');
					table.setAttribute('style', 'width:100%;border-collapse:collapse;table-layout:fixed;');
					const tr = iDoc.createElement('tr');
					const w = Math.floor(100 / cols.length);
					cols.forEach(col => {
						const td = iDoc.createElement('td');
						td.setAttribute('style', (col.getAttribute('style') || '') + `;vertical-align:top;width:${w}%;`);
						while (col.firstChild) td.appendChild(col.firstChild);
						tr.appendChild(td);
					});
					table.appendChild(tr);
					colContainer.parentNode.replaceChild(table, colContainer);
				});

				clone.querySelectorAll('.block-controls,.drag-handle,.column-copy-label,.column-options,.block-add-btn,.block-toolbar,.sub-content-decoration').forEach(el => el.remove());

				resolve(clone.outerHTML);
			} catch (e) {
				resolve(markup);
			} finally {
				document.body.removeChild(iframe);
			}
		};

		iWin.requestAnimationFrame(() => iWin.requestAnimationFrame(doWork));
	});
}

async function confirmFileSave() {
	const nameRaw = document.getElementById('saveFileNameInput').value.trim();
	const name = nameRaw || 'content';
	const formats = Array.from(document.querySelectorAll('input[name="saveFileFormat"]:checked')).map(el => el.value);

	if (!formats.length) { alert('저장 형식을 하나 이상 선택하세요.'); return; }

	const btn = document.getElementById('saveFileConfirm');
	const progressWrap = document.getElementById('saveFileProgress');
	const progressFill = document.getElementById('saveProgressFill');
	const progressMsg  = document.getElementById('saveProgressMsg');
	const btnOrigHtml  = btn.innerHTML;
	const hasPdf = formats.includes('pdf');

	function _setProgress(msg, pct) {
		if (progressFill) progressFill.style.width = pct + '%';
		if (progressMsg)  progressMsg.textContent  = msg;
	}

	btn.disabled = true;
	btn.innerHTML = '<span class="save-btn-spinner"></span> 처리 중...';
	if (hasPdf && progressWrap) { progressWrap.hidden = false; _setProgress('저장 준비 중...', 0); }

	try {
		const markup = generateMarkup();
		const contentCss = formats.includes('html') ? await _fetchContentCss() : '';

		for (const format of formats) {
			if (format === 'klic') {
				downloadProjectKlic(createProjectSnapshot(), name);
			} else if (format === 'html') {
				const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(name)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.7.0/fonts/remixicon.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
${contentCss}
</style>
</head>
<body>
${markup}
</body>
</html>`;
				downloadBlob(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }), `${name}.html`);

			} else if (format === 'doc') {
				const docBody = await _buildDocBody(markup);
				const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(name)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
*{box-sizing:border-box}
body{font-family:'맑은 고딕',Arial,sans-serif;margin:0;padding:0}
table{border-collapse:collapse}
ul,ol,li{list-style:none;margin:0;padding:0}
p,h1,h2,h3,h4,h5,h6{margin:0;padding:0}
</style>
</head>
<body lang="ko">
${docBody}
</body>
</html>`;
				downloadBlob(new Blob(['\ufeff', docHtml], { type: 'application/msword' }), `${name}.doc`);

			} else if (format === 'hwpx') {
				const blob = await _buildHwpxBlob(name);
				downloadBlob(blob, `${name}.hwpx`);
			} else if (format === 'pdf') {
				const blob = await _buildPdfBlob(name, hasPdf ? _setProgress : null);
				downloadBlob(blob, `${name}.pdf`);
			}
		}
		closeFileSaveModal();
	} catch (e) {
		alert('파일 생성 중 오류가 발생했습니다: ' + e.message);
	} finally {
		btn.disabled = false;
		btn.innerHTML = btnOrigHtml;
		if (progressWrap) { progressWrap.hidden = true; _setProgress('', 0); }
	}
}

function _collectHwpUnits(el, iWin, units) {
	if (!el || !el.tagName) return;
	const tag = el.tagName.toLowerCase();
	const UI = ['block-controls','drag-handle','column-copy-label','column-options','block-add-btn','block-toolbar','sub-content-decoration'];
	if (UI.some(c => el.classList && el.classList.contains(c))) return;

	const cs = iWin.getComputedStyle(el);
	if (cs.display === 'none') return;

	if (tag === 'table') {
		const tbl = { type: 'table', rows: [] };
		const addRow = tr => {
			const row = { cells: [] };
			tr.querySelectorAll(':scope > td, :scope > th').forEach(cell => {
				const content = [];
				const isDirectText = !Array.from(cell.children).some(c => {
					const ct = c.tagName.toLowerCase();
					return ['p','h1','h2','h3','h4','h5','h6','li','ul','ol','table','blockquote'].includes(ct) || (c.classList && c.classList.contains('builder-columns'));
				});
				if (isDirectText) {
					const txt = cell.textContent.trim();
					if (txt) {
						const ccs = iWin.getComputedStyle(cell);
						content.push(_makeHwpPara(txt, ccs));
					}
				} else {
					Array.from(cell.children).forEach(child => _collectHwpUnits(child, iWin, content));
				}
				row.cells.push({ content, isHeader: cell.tagName === 'TH' });
			});
			if (row.cells.length) tbl.rows.push(row);
		};
		['thead','tbody','tfoot'].forEach(s => el.querySelectorAll(`:scope > ${s} > tr`).forEach(addRow));
		el.querySelectorAll(':scope > tr').forEach(addRow);
		if (tbl.rows.length) units.push(tbl);
		return;
	}

	// .builder-columns ???섑룊 HWPML table
	if (el.classList && el.classList.contains('builder-columns')) {
		const cols = Array.from(el.children).filter(c => !UI.some(u => c.classList && c.classList.contains(u)));
		if (cols.length) {
			const tbl = { type: 'table', rows: [{ cells: [] }] };
			cols.forEach(col => {
				const content = [];
				Array.from(col.children).forEach(child => _collectHwpUnits(child, iWin, content));
				tbl.rows[0].cells.push({ content, isHeader: false });
			});
			units.push(tbl);
			return;
		}
	}

	const TEXT_TAGS = new Set(['p','h1','h2','h3','h4','h5','h6','li','blockquote','figcaption','dt','dd']);
	if (TEXT_TAGS.has(tag)) {
		const txt = el.textContent.trim();
		if (txt) units.push(_makeHwpPara(txt, cs));
		return;
	}

	// ?ш?
	Array.from(el.children).forEach(child => _collectHwpUnits(child, iWin, units));
}

function _makeHwpPara(text, cs) {
	const fontSizePt = Math.max(6, Math.round(parseFloat(cs.fontSize) * 72 / 96));
	const bold = parseInt(cs.fontWeight) >= 700;
	const italic = cs.fontStyle === 'italic' || cs.fontStyle === 'oblique';
	const color = _cssColorToHex(cs.color);
	const bgRaw = cs.backgroundColor;
	const bgColor = (bgRaw && bgRaw !== 'rgba(0, 0, 0, 0)' && bgRaw !== 'transparent') ? _cssColorToHex(bgRaw) : null;
	const alignMap = { left: '0', center: '1', right: '2', justify: '3' };
	const align = alignMap[cs.textAlign] ?? '0';
	return { type: 'para', text, fontSizePt, bold, italic, color, bgColor, align };
}

async function _buildPdfBlob(name, onProgress) {
	if (!window.htmlToImage) throw new Error('html-to-image 라이브러리를 불러오지 못했습니다.');
	if (!window.jspdf) throw new Error('jsPDF 라이브러리를 불러오지 못했습니다.');

	const wrapperEl  = document.getElementById('canvasWrapper');
	const gridEl     = document.getElementById('canvasGrid');
	if (!wrapperEl || !gridEl) throw new Error('캔버스 요소를 찾을 수 없습니다.');

	onProgress?.('이미지 변환 중...', 10);

	// Convert already-loaded images to data URLs via canvas (avoids CORS/taint on htmlToImage).
	const imgs = [...gridEl.querySelectorAll('img')];
	const imgOrigSrcs = imgs.map(img => img.getAttribute('src'));
	imgs.forEach(img => {
		if (img.src.startsWith('data:') || !img.naturalWidth || !img.naturalHeight) return;
		try {
			const c = document.createElement('canvas');
			c.width = img.naturalWidth;
			c.height = img.naturalHeight;
			c.getContext('2d').drawImage(img, 0, 0);
			img.src = c.toDataURL('image/png');
		} catch (e) {}
	});

	// Mirror savePreviewImage() exactly:
	// 1) Apply preview-export class so CSS hides UI chrome and cleans up layout
	// 2) Capture canvasWrapper (not canvasGrid) with explicit width/height
	// 3) Pass width/height options to htmlToImage to fix the right-shift caused by margin:auto
	document.body.classList.add('preview-export');

	const gridW = gridEl.offsetWidth;
	const gridH = gridEl.scrollHeight;

	const savedWrapper = {
		overflow: wrapperEl.style.overflow, height: wrapperEl.style.height,
		maxHeight: wrapperEl.style.maxHeight, width: wrapperEl.style.width, maxWidth: wrapperEl.style.maxWidth,
	};
	const savedGridMargin = gridEl.style.margin;

	wrapperEl.style.overflow  = 'visible';
	wrapperEl.style.height    = gridH + 'px';
	wrapperEl.style.maxHeight = 'none';
	wrapperEl.style.width     = gridW + 'px';
	wrapperEl.style.maxWidth  = gridW + 'px';
	wrapperEl.scrollTop  = 0;
	wrapperEl.scrollLeft = 0;
	gridEl.style.margin = '0';

	let dataUrl;
	try {
		onProgress?.('캔버스 캡처 중...', 40);
		await document.fonts.ready;
		dataUrl = await window.htmlToImage.toPng(wrapperEl, {
			backgroundColor: '#ffffff',
			width: gridW,
			height: gridH,
			pixelRatio: 2,
		});
	} finally {
		wrapperEl.style.overflow  = savedWrapper.overflow;
		wrapperEl.style.height    = savedWrapper.height;
		wrapperEl.style.maxHeight = savedWrapper.maxHeight;
		wrapperEl.style.width     = savedWrapper.width;
		wrapperEl.style.maxWidth  = savedWrapper.maxWidth;
		gridEl.style.margin = savedGridMargin;
		document.body.classList.remove('preview-export');
		imgs.forEach((img, i) => { img.setAttribute('src', imgOrigSrcs[i]); });
	}

	onProgress?.('PDF 생성 중...', 70);

	const { jsPDF } = window.jspdf;
	const A4_W = 210, A4_H = 297, MARGIN = 10;
	const contentW = A4_W - MARGIN * 2;
	const contentH = A4_H - MARGIN * 2;

	const img = new Image();
	await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });

	const scaledH = (img.naturalHeight / img.naturalWidth) * contentW;
	const totalPages = Math.ceil(scaledH / contentH);
	const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

	// Split image across pages if taller than one A4 page
	let pageIndex = 0;
	let yRendered = 0;

	while (yRendered < scaledH) {
		if (pageIndex > 0) pdf.addPage();

		const pageH = Math.min(contentH, scaledH - yRendered);
		const srcY = Math.floor((yRendered / scaledH) * img.naturalHeight);
		const srcH = Math.ceil((pageH / scaledH) * img.naturalHeight);

		const slice = document.createElement('canvas');
		slice.width = img.naturalWidth;
		slice.height = srcH;
		slice.getContext('2d').drawImage(img, 0, -srcY);

		const sliceH = (srcH / img.naturalWidth) * contentW;
		pdf.addImage(slice.toDataURL('image/png'), 'PNG', MARGIN, MARGIN, contentW, sliceH);

		yRendered += contentH;
		pageIndex++;
		onProgress?.(
			totalPages > 1 ? `PDF 생성 중... (${pageIndex}/${totalPages}페이지)` : 'PDF 생성 중...',
			Math.min(95, 70 + Math.round((pageIndex / totalPages) * 25))
		);
	}

	onProgress?.('다운로드 준비 중...', 100);
	return pdf.output('blob');
}

async function _buildHwpxBlob(name) {
	if (!window.JSZip) throw new Error('JSZip 라이브러리를 불러오지 못했습니다.');

	const canvasEl = document.getElementById('canvasGrid');
	if (!canvasEl) throw new Error('캔버스 요소를 찾을 수 없습니다.');

	const units = [];
	_collectHwpUnits(canvasEl, window, units);

	if (!units.length) units.push({ type: 'para', text: '(내용 없음)', fontSizePt: 10, bold: false, italic: false, color: '000000', bgColor: null, align: '0' });

	const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

	const charShapeMap = new Map(), charShapes = [];
	const paraShapeMap = new Map(), paraShapes = [];
	const fillMap = new Map(), borderFills = [{ color: null }]; // id 0 = no fill
	fillMap.set(null, 0);

	function getCharId(u) {
		const k = `${u.fontSizePt}|${u.bold}|${u.italic}|${u.color}`;
		if (!charShapeMap.has(k)) { charShapeMap.set(k, charShapes.length); charShapes.push(u); }
		return charShapeMap.get(k);
	}
	function getParaId(align) {
		if (!paraShapeMap.has(align)) { paraShapeMap.set(align, paraShapes.length); paraShapes.push({ align }); }
		return paraShapeMap.get(align);
	}
	function getFillId(color) {
		if (!color) return 0;
		if (!fillMap.has(color)) { fillMap.set(color, borderFills.length); borderFills.push({ color }); }
		return fillMap.get(color);
	}
	function collectShapes(us) {
		us.forEach(u => {
			if (u.type === 'para') { getCharId(u); getParaId(u.align); if (u.bgColor) getFillId(u.bgColor); }
			else if (u.type === 'table') u.rows.forEach(r => r.cells.forEach(c => collectShapes(c.content)));
		});
	}
	collectShapes(units);

	// XML 생성
	const FULL_W = 42520;
	let nodeId = 1;

	function paraXml(u) {
		const bfId = getFillId(u.bgColor);
		return `  <hp:p>
    <hp:pPr><hp:paraStyle hp:styleIDRef="0" hp:paraShapeIDRef="${getParaId(u.align)}"${bfId ? ` hp:borderFillIDRef="${bfId}"` : ''}/></hp:pPr>
    <hp:run hp:charShapeIDRef="${getCharId(u)}"><hp:t>${esc(u.text)}</hp:t></hp:run>
  </hp:p>`;
	}

	function cellXml(content) {
		if (!content.length) return `    <hp:p><hp:run hp:charShapeIDRef="0"><hp:t></hp:t></hp:run></hp:p>`;
		return content.map(u => u.type === 'para' ? paraXml(u) : tblXml(u)).join('\n');
	}

	function tblXml(t) {
		const colCount = t.rows.reduce((m, r) => Math.max(m, r.cells.length), 1);
		const colW = Math.floor(FULL_W / colCount);
		const id = nodeId++;
		const rowsXml = t.rows.map((row, ri) =>
			`  <hp:tr hp:height="700">\n` +
			row.cells.map((cell, ci) =>
`    <hp:tc hp:header="${cell.isHeader ? 1 : 0}" hp:hasMargin="1" hp:borderFillIDRef="0" hp:width="${colW}" hp:height="700">
      <hp:cellAddr hp:colAddr="${ci}" hp:rowAddr="${ri}"/>
      <hp:cellSpan hp:colSpan="1" hp:rowSpan="1"/>
      <hp:cellSz hp:width="${colW}" hp:height="700"/>
      <hp:cellMargin hp:left="141" hp:right="141" hp:top="141" hp:bottom="141"/>
${cellXml(cell.content)}
    </hp:tc>`).join('\n') +
			`\n  </hp:tr>`
		).join('\n');
		return `<hp:tbl hp:id="${id}" hp:z="0" hp:numberingType="none" hp:textWrap="asCharacter" hp:vertRelTo="para" hp:vertRelEdge="top" hp:horzRelTo="para" hp:horzRelEdge="left" hp:width="${FULL_W}" hp:height="700" hp:marginLeft="0" hp:marginRight="0" hp:marginTop="0" hp:marginBottom="0" hp:borderFillIDRef="0" hp:cellSpacing="0">
${rowsXml}
</hp:tbl>`;
	}

	const sectionContent = units.map(u => u.type === 'para' ? paraXml(u) : tblXml(u)).join('\n');

	const charShapeXml = charShapes.map((cs, id) =>
		`      <hh:charShape hh:id="${id}" hh:height="${cs.fontSizePt * 100}" hh:textColor="${parseInt(cs.color, 16)}" hh:bold="${cs.bold ? 1 : 0}" hh:italic="${cs.italic ? 1 : 0}" hh:borderFillIDRef="0">
        <hh:fontRef hh:lang="ko" hh:face="0"/>
        <hh:fontRef hh:lang="en" hh:face="1"/>
      </hh:charShape>`
	).join('\n');

	const paraShapeXml = paraShapes.map((ps, id) =>
		`      <hh:paraShape hh:id="${id}" hh:marginLeft="0" hh:marginRight="0" hh:marginTop="0" hh:marginBottom="200" hh:lineSpacing="160" hh:lineSpacingType="percent" hh:align="${ps.align}"/>`
	).join('\n');

	const borderFillXml = borderFills.map((bf, id) =>
		`      <hh:borderFill hh:id="${id}">
        ${bf.color ? `<hh:fillBrush><hh:winBrush hh:faceColor="${parseInt(bf.color, 16)}" hh:hatchColor="0"/></hh:fillBrush>` : '<hh:fillBrush><hh:noFill/></hh:fillBrush>'}
        <hh:border hh:type="none" hh:color="0" hh:width="0"/>
      </hh:borderFill>`
	).join('\n');

	const zip = new window.JSZip();
	zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });

	zip.file('META-INF/container.xml',
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="Contents/content.hpf" media-type="application/hwp+zip"/>
  </rootfiles>
</container>`);

	zip.file('Contents/content.hpf',
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<opf:package xmlns:opf="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="HwpDoc">
  <opf:metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">${esc(name)}</dc:title>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">ko</dc:language>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="docInfo" href="docInfo.xml" media-type="application/xml"/>
    <opf:item id="header" href="header.xml" media-type="application/xml"/>
    <opf:item id="section0" href="section0.xml" media-type="application/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="section0"/>
  </opf:spine>
</opf:package>`);

	zip.file('Contents/docInfo.xml',
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:docInfo xmlns:hh="http://www.hancom.com/hwpml/2011/docinfo">
  <hh:beginNum hh:page="1" hh:footnote="1" hh:endnote="1" hh:pic="1" hh:tbl="1" hh:equation="1"/>
  <hh:caretPos hh:list="0" hh:para="0" hh:pos="0"/>
</hh:docInfo>`);

	zip.file('Contents/header.xml',
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:hh="http://www.hancom.com/hwpml/2011/head">
  <hh:refList>
    <hh:fontfaces>
      <hh:fontface hh:name="한글" hh:lang="ko">
        <hh:font hh:name="맑은 고딕" hh:typeInfo="0"/>
      </hh:fontface>
      <hh:fontface hh:name="영문" hh:lang="en">
        <hh:font hh:name="Arial" hh:typeInfo="0"/>
      </hh:fontface>
    </hh:fontfaces>
    <hh:charShapes>
${charShapeXml}
    </hh:charShapes>
    <hh:paraShapes>
${paraShapeXml}
    </hh:paraShapes>
    <hh:borderFills>
${borderFillXml}
    </hh:borderFills>
    <hh:styles>
      <hh:style hh:type="para" hh:id="0" hh:name="바탕글" hh:engName="Normal" hh:paraShapeIDRef="0" hh:charShapeIDRef="0"/>
    </hh:styles>
  </hh:refList>
</hh:head>`);

	zip.file('Contents/section0.xml',
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.com/hwpml/2011/section"
        xmlns:hp="http://www.hancom.com/hwpml/2011/paragraph">
  <hs:secPr>
    <hs:pageSize hs:width="21000" hs:height="29700" hs:orient="portrait"/>
    <hs:pageMargin hs:left="3000" hs:right="3000" hs:top="2000" hs:bottom="2000" hs:header="850" hs:footer="850" hs:gutter="0"/>
  </hs:secPr>
${sectionContent}
</hs:sec>`);

	return zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' });
}

async function savePreviewImage() {
	if (!state.blocks.length) return;
	const lib = window.htmlToImage;
	if (!lib) { alert('이미지 저장 라이브러리를 불러오지 못했습니다.'); return; }

	await document.fonts.ready;

	const btn = savePreviewImageButton;
	btn.disabled = true;

	const wasOverlayEdit = document.body.classList.contains('overlay-edit');
	if (wasOverlayEdit) document.body.classList.remove('overlay-edit');
	renderOverlayItems();

	const captureTarget = document.getElementById('canvasWrapper');
	const canvasGridEl = document.getElementById('canvasGrid');
	if (!captureTarget || !canvasGridEl) {
		alert('이미지 저장 대상 요소를 찾을 수 없습니다.');
		btn.disabled = false;
		return;
	}

	document.body.classList.add('preview-export');

	// canvasGrid ?ㅼ젣 ?ш린 痢≪젙 (preview-export CSS ?곸슜 ??
	const gridWidth = canvasGridEl.offsetWidth;
	const gridHeight = canvasGridEl.scrollHeight;

	const orig = {
		wOverflow: captureTarget.style.overflow,
		wHeight:   captureTarget.style.height,
		wMaxHeight: captureTarget.style.maxHeight,
		wWidth:    captureTarget.style.width,
		wMaxWidth: captureTarget.style.maxWidth,
		wScrollTop: captureTarget.scrollTop,
		wScrollLeft: captureTarget.scrollLeft,
		gMargin:   canvasGridEl.style.margin,
	};
	captureTarget.style.overflow  = 'visible';
	captureTarget.style.height    = `${gridHeight}px`;
	captureTarget.style.maxHeight = 'none';
	captureTarget.style.width     = `${gridWidth}px`;
	captureTarget.style.maxWidth  = `${gridWidth}px`;
	captureTarget.scrollTop  = 0;
	captureTarget.scrollLeft = 0;
	canvasGridEl.style.margin = '0';

	const guide = captureTarget.querySelector('.canvas-guide');
	if (guide) guide.hidden = true;

	const exportImgs = [...captureTarget.querySelectorAll('img')];
	const imgOrigSrcs = exportImgs.map(img => img.getAttribute('src'));
	await Promise.all(exportImgs.map(async (img) => {
		try {
			const resp = await fetch(img.src);
			const blob = await resp.blob();
			const dataUrl = await new Promise(resolve => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = () => resolve(null);
				reader.readAsDataURL(blob);
			});
			if (dataUrl) img.src = dataUrl;
		} catch (e) {}
	}));

	try {
		const targetWidth = Number(state.canvasWidth) || 1241;
		const pixelRatio = targetWidth / Math.max(1, gridWidth);
		const dataUrl = await lib.toPng(captureTarget, {
			backgroundColor: '#ffffff',
			width: gridWidth,
			height: gridHeight,
			pixelRatio
		});
		const link = document.createElement('a');
		link.href = dataUrl;
		link.download = `grid-builder-${Date.now()}.png`;
		link.click();
	} catch (e) {
		console.error(e);
		alert('이미지 저장에 실패했습니다.');
	} finally {
		exportImgs.forEach((img, i) => { if (imgOrigSrcs[i]) img.src = imgOrigSrcs[i]; });
		if (guide) guide.hidden = false;
		captureTarget.style.overflow  = orig.wOverflow;
		captureTarget.style.height    = orig.wHeight;
		captureTarget.style.maxHeight = orig.wMaxHeight;
		captureTarget.style.width     = orig.wWidth;
		captureTarget.style.maxWidth  = orig.wMaxWidth;
		captureTarget.scrollTop  = orig.wScrollTop;
		captureTarget.scrollLeft = orig.wScrollLeft;
		canvasGridEl.style.margin = orig.gMargin;
		document.body.classList.remove('preview-export');
		btn.disabled = false;
		if (wasOverlayEdit) {
			document.body.classList.add('overlay-edit');
			renderOverlayItems();
		}
	}
}

function showTemplateLoadError(error) {
	componentList.innerHTML = `<p class="template-error">${escapeHtml(error.message)}</p>`;
	canvasGrid.innerHTML = '<div class="canvas-empty">템플릿을 불러오지 못했습니다.</div>';
}

let _listEditButtons = null;
let _listEditTarget = null;
let _listEditHideTimer = null;

function createListEditButtons() {
	const el = document.createElement('div');
	el.id = 'listEditButtons';
	el.className = 'list-edit-buttons';
	el.hidden = true;
	el.innerHTML = `
		<button type="button" class="list-edit-btn list-add-btn" title="항목 추가 (아래)">
			<i class="ri-add-line" aria-hidden="true"></i>
		</button>
		<button type="button" class="list-edit-btn list-del-btn" title="항목 삭제">
			<i class="ri-delete-bin-line" aria-hidden="true"></i>
		</button>
	`;
	document.body.appendChild(el);

	el.addEventListener('mouseenter', () => clearTimeout(_listEditHideTimer));
	el.addEventListener('mouseleave', () => {
		_listEditHideTimer = setTimeout(() => { el.hidden = true; }, 120);
	});
	el.querySelector('.list-add-btn').addEventListener('click', () => {
		if (!_listEditTarget) return;
		addListItem(_listEditTarget.blockId, _listEditTarget.columnIndex, _listEditTarget.fieldKey);
		el.hidden = true;
	});
	el.querySelector('.list-del-btn').addEventListener('click', () => {
		if (!_listEditTarget) return;
		deleteListItem(_listEditTarget.blockId, _listEditTarget.columnIndex, _listEditTarget.fieldKey);
		el.hidden = true;
	});
	return el;
}

function positionListEditButtons(li) {
	_listEditButtons.hidden = false;
	const rect = li.getBoundingClientRect();
	const bh = _listEditButtons.offsetHeight;
	const bw = _listEditButtons.offsetWidth;
	let left = rect.right + 6;
	let top = rect.top + rect.height / 2 - bh / 2;
	left = Math.min(left, window.innerWidth - bw - 4);
	top = Math.max(4, Math.min(top, window.innerHeight - bh - 4));
	_listEditButtons.style.left = `${left}px`;
	_listEditButtons.style.top = `${top}px`;

	const columnIndex = Number(li.dataset.columnIndex);
	const targetItems = getEditTargetItems(li.dataset.blockId);
	const itemCount = targetItems ? getEditListItems(targetItems[columnIndex] || {}).length : 0;
	_listEditButtons.querySelector('.list-del-btn').disabled = itemCount <= 1;
}

function restoreListEditButtons() {
	if (!_listEditButtons || !_listEditTarget) return;
	requestAnimationFrame(() => {
		const selector = `.edit-list li[data-block-id="${CSS.escape(_listEditTarget.blockId)}"][data-column-index="${_listEditTarget.columnIndex}"][data-edit-field="${CSS.escape(_listEditTarget.fieldKey)}"]`;
		const li = document.querySelector(selector) || document.querySelector(`.edit-list li[data-block-id="${CSS.escape(_listEditTarget.blockId)}"][data-column-index="${_listEditTarget.columnIndex}"]`);
		if (!li) return;
		positionListEditButtons(li);
	});
}

function bindEditListEvents() {
	document.querySelectorAll('.edit-list li[data-block-id]').forEach(li => {
		li.addEventListener('mouseenter', () => {
			if (document.body.classList.contains('preview-mode')) return;
			clearTimeout(_listEditHideTimer);
			_listEditTarget = {
				blockId: li.dataset.blockId,
				columnIndex: Number(li.dataset.columnIndex),
				fieldKey: li.dataset.editField
			};
			positionListEditButtons(li);
		});
		li.addEventListener('mouseleave', () => {
			_listEditHideTimer = setTimeout(() => {
				if (!_listEditButtons.matches(':hover')) _listEditButtons.hidden = true;
			}, 120);
		});
	});
}

let _savedRange = null;
let _savedEditTarget = null;
let _colorPickerOpen = false;
let _toolbarPinned = false;
let _nlToolbarActive = false;
function createFormatToolbar() {
	const el = document.createElement('div');
	el.id = 'textFormatToolbar';
	el.className = 'text-format-toolbar';
	el.hidden = true;
	el.innerHTML = `
		<button type="button" class="fmt-btn" data-cmd="bold" title="굵게"><b>B</b></button>
		<button type="button" class="fmt-btn" data-cmd="underline" title="밑줄"><u>U</u></button>
		<label class="fmt-color" title="글자색"><input type="color" value="#000000"></label>
		<span class="fmt-divider" aria-hidden="true"></span>
		<button type="button" class="fmt-btn fmt-close" title="닫기" aria-label="닫기"><i class="ri-close-line" aria-hidden="true"></i></button>
	`;
	document.body.appendChild(el);

	const colorInput = el.querySelector('input[type="color"]');

	el.addEventListener('mousedown', e => {
		if (e.target !== colorInput) e.preventDefault();
		saveFormatRange();
	});

	el.querySelectorAll('[data-cmd]').forEach(btn => {
		btn.addEventListener('click', () => {
			restoreFormatRange();
			document.execCommand(btn.dataset.cmd);
			updateFormatState(el);
		});
	});

	el.querySelector('.fmt-close').addEventListener('click', () => {
		_toolbarPinned = false;
		el.hidden = true;
	});

	colorInput.addEventListener('mousedown', () => {
		_colorPickerOpen = true;
		saveFormatRange();
	});

	colorInput.addEventListener('input', () => {
		restoreFormatRange();
		document.execCommand('foreColor', false, colorInput.value);
		saveFormatRange();
	});

	colorInput.addEventListener('change', () => {
		_colorPickerOpen = false;
		_toolbarPinned = true;
		if (_savedEditTarget && _savedRange) {
			const wasEditable = _savedEditTarget.getAttribute('contenteditable') === 'true';
			if (!wasEditable) _savedEditTarget.setAttribute('contenteditable', 'true');
			restoreFormatRange();
			document.execCommand('foreColor', false, colorInput.value);
			if (!wasEditable) {
				const html = _savedEditTarget.innerHTML;
				const block = state.blocks.find(b => b.id === _savedEditTarget.dataset.blockId);
				const columnIndex = Number(_savedEditTarget.dataset.columnIndex);
				if (block && block.items[columnIndex]) {
					block.items[columnIndex][_savedEditTarget.dataset.editField] = html;
				}
				_savedEditTarget.removeAttribute('contenteditable');
				_savedRange = null;
				_savedEditTarget = null;
				el.hidden = true;
				_toolbarPinned = false;
				render();
			} else {
				saveFormatRange();
			}
		}
	});

	return el;
}

function saveFormatRange() {
	const sel = window.getSelection();
	if (sel?.rangeCount > 0) {
		_savedRange = sel.getRangeAt(0).cloneRange();
		_savedEditTarget = sel.anchorNode?.parentElement?.closest('[contenteditable="true"]') || null;
	} else {
		_savedRange = null;
		_savedEditTarget = null;
	}
}

function restoreFormatRange() {
	if (!_savedRange) return;
	if (_savedEditTarget) _savedEditTarget.focus();
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(_savedRange);
}

function positionFormatToolbar(toolbar, rect) {
	toolbar.hidden = false;
	const tw = toolbar.offsetWidth;
	const th = toolbar.offsetHeight;
	let left = rect.left + rect.width / 2 - tw / 2;
	let top = rect.top - th - 8;
	if (top < 4) top = rect.bottom + 8;
	left = Math.max(4, Math.min(left, window.innerWidth - tw - 4));
	top = Math.max(4, Math.min(top, window.innerHeight - th - 4));
	toolbar.style.left = `${left}px`;
	toolbar.style.top = `${top}px`;
}

function updateFormatState(toolbar) {
	toolbar.querySelector('[data-cmd="bold"]').classList.toggle('is-active', document.queryCommandState('bold'));
	toolbar.querySelector('[data-cmd="underline"]').classList.toggle('is-active', document.queryCommandState('underline'));
}

function initFormatToolbar() {
	const toolbar = createFormatToolbar();

	document.addEventListener('selectionchange', () => {
		if (document.body.classList.contains('preview-mode')) return;
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.toString().trim()) {
			setTimeout(() => {
				if (!toolbar.matches(':hover') && !_colorPickerOpen && !_toolbarPinned) toolbar.hidden = true;
			}, 120);
			return;
		}
		const anchor = sel.anchorNode?.parentElement?.closest('[contenteditable="true"]');
		if (!anchor) {
			if (!_colorPickerOpen && !_toolbarPinned) toolbar.hidden = true;
			return;
		}
		_toolbarPinned = false;
		saveFormatRange();
		positionFormatToolbar(toolbar, sel.getRangeAt(0).getBoundingClientRect());
		updateFormatState(toolbar);
	});
}

async function init() {
	componentList.classList.add('is-empty-state');
	applyBuilderPresetFilters();
	try {
		await Promise.all([loadTemplates(), loadIconCategories()]);
		renderComponentList();
		if (state.sidebarTab === 'custom') renderCustomPanel();
		render();
	} catch (error) {
		console.error(error);
		showTemplateLoadError(error);
	}

	KlicBuilderShared.bindClearCanvas(clearCanvas);
	document.getElementById('copyMarkup').addEventListener('click', copyMarkup);
	_markupTabs = KlicBuilderShared.bindMarkupTabs({
		output: markupOutput,
		getMarkup: () => _lastFullMarkup
	});
	document.getElementById('propPpApplyBtn')?.addEventListener('click', () => {
		const schoolName = document.getElementById('propPpSchoolName')?.value.trim() || '';
		const schoolUrl = document.getElementById('propPpSchoolUrl')?.value.trim() || '';
		const startDate = document.getElementById('propPpStartDate')?.value || '';
		pushHistory();
		state.templateVars.schoolName = schoolName;
		state.templateVars.schoolUrl = schoolUrl;
		if (startDate) state.templateVars.startYear = _ppFormatDateToKorean(startDate);
		render();
	});
	bindFilterEvents();
	KlicBuilderShared.bindSidebarTabs(tab => {
		state.sidebarTab = tab;
		if (tab === 'custom') renderCustomPanel();
		if (tab === 'design-blocks') ensureDesignBlockPanelLoaded();
	});
	bindDesignBlockPanelEvents();
	previewToggle.addEventListener('click', togglePreview);
	previewReturn.addEventListener('click', returnToCanvas);
	savePreviewImageButton.addEventListener('click', savePreviewImage);
	saveProjectJsonButton?.addEventListener('click', saveProjectJson);
	saveFileButton?.addEventListener('click', openFileSaveModal);
	loadProjectKlicButton?.addEventListener('click', () => loadProjectKlicInput?.click());
	loadProjectKlicInput?.addEventListener('change', async () => {
		const file = loadProjectKlicInput.files?.[0];
		if (!file) return;
		try {
			await loadProjectKlicFile(file);
		} catch (error) {
			console.error(error);
			alert('KLIC 파일을 불러오지 못했습니다.');
		} finally {
			loadProjectKlicInput.value = '';
		}
	});
	document.getElementById('saveFileClose').addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileCancel').addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileBackdrop').addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileConfirm').addEventListener('click', confirmFileSave);
	previewMarkupOpenButton?.addEventListener('click', openMarkupFromPreview);
	markupToggle.addEventListener('click', toggleMarkupPanel);
	initBlockPropsPanel();
	initNlInlineToolbar();
	initSmartInlinePopup();
	window.addEventListener('resize', syncCanvasGuideSize);
	document.getElementById('overlayEditToggle')?.addEventListener('click', toggleOverlayEdit);
	document.getElementById('overlayEditDone')?.addEventListener('click', exitOverlayEdit);
	initOverlayLayer();
	initCompactHeader();
	initResponsiveTopbarMenu();
	document.getElementById('markupClose').addEventListener('click', closeMarkup);
	document.getElementById('markupBackdrop').addEventListener('click', closeMarkup);
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape') { closeMarkup(); closeFileSaveModal(); closeTableCellSpanPopover(); closeTableContextMenu(false); }
		if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
			const active = document.activeElement;
			if (active?.getAttribute('contenteditable') === 'true') return;
			if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
			e.preventDefault();
			undo();
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			const active = document.activeElement;
			if (active?.getAttribute('contenteditable') === 'true') return;
			if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
			const selectedBlockId = state.selectedItem?.blockId;
			if (!selectedBlockId) return;
			if (selectedBlockId.includes('::')) return;
			e.preventDefault();
			removeBlock(selectedBlockId);
		}
	});
	canvasGrid.addEventListener('click', event => {
		const anchor = event.target.closest('a');
		if (!anchor) return;
		const tabAction = anchor.dataset.klicTabAction;
		if (tabAction === 'panel') {
			event.preventDefault();
			const tab = anchor.closest('.tab-st');
			if (tab) {
				const idx = Number(anchor.dataset.tabItemIdx || anchor.closest('li')?.dataset.tabItemIdx || 0);
				tab.querySelectorAll('li').forEach(li => li.classList.remove('on'));
				anchor.closest('li')?.classList.add('on');
				const panel = tab.nextElementSibling?.classList.contains('tabs-01-panel') ? tab.nextElementSibling : null;
				if (panel) {
					panel.querySelectorAll('.tabs-01-panel-item').forEach((item, itemIdx) => {
						item.classList.toggle('is-active', itemIdx === idx);
					});
				}
			}
			return;
		}
		if (tabAction === 'link' && !document.body.classList.contains('preview-mode')) {
			event.preventDefault();
			return;
		}
		if (!document.body.classList.contains('preview-mode') && (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download'))) {
			event.preventDefault();
		}
	}, true);
	canvasGrid.addEventListener('dblclick', event => {
		if (event.target.closest('a')) event.preventDefault();
	}, true);
	canvasGrid.addEventListener('dragleave', event => {
		if (!canvasGrid.contains(event.relatedTarget)) {
			canvasGrid.classList.remove('is-over');
			document.body.classList.remove('nl-body-dragging');
		}
	});
	const canvasWrapper = document.getElementById('canvasWrapper');
	KlicBuilderShared.bindCanvasDropTargets({ canvasGrid, canvasWrapper, onDragOver: handleCanvasDragOver, onDrop: handleCanvasDrop });

	canvasGrid.addEventListener('dragover', event => {
		if (document.body.classList.contains('preview-mode')) return;
		if (event.target.closest('[data-list-row]')) return;
		if (event.target.closest('.nl-body-block-wrap')) return;
		if (event.target.closest('.nl-body-sep')) return;
	const bodyArea = event.target.closest("[data-edit-field='body']");
		if (!bodyArea) return;
		const payload = state.dragPayload;
		if (!payload.startsWith('new-block:') && !payload.startsWith('existing-block:')) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		event.dataTransfer.dropEffect = 'copy';
		bodyArea.classList.add('nl-body-drop-over');
		document.body.classList.add('nl-body-dragging');
	}, true);

	canvasGrid.addEventListener('drop', event => {
		if (document.body.classList.contains('preview-mode')) return;
		if (event.target.closest('[data-list-row]')) return;
		if (event.target.closest('.nl-body-block-wrap')) return;
		if (event.target.closest('.nl-body-sep')) return;
	const bodyArea = event.target.closest("[data-edit-field='body']");
		if (!bodyArea) return;
		const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
		const isNew = payload.startsWith('new-block:');
		const isExisting = payload.startsWith('existing-block:');
		if (!isNew && !isExisting) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		bodyArea.classList.remove('nl-body-drop-over');
		document.body.classList.remove('nl-body-dragging');
		clearDropIndicators();
		state.dragPayload = '';
		const builderBlock = bodyArea.closest('.builder-block');
		if (!builderBlock) return;
		const sectionBlockId = builderBlock.dataset.blockId;
		if (!state.blocks.find(b => b.id === sectionBlockId)) return;
		pushHistory();
		if (isExisting) {
			const existingBlock = state.blocks.find(b => b.id === payload.replace('existing-block:', ''));
			if (!existingBlock) return;
			existingBlock._isNlBodyBlock = true;
			existingBlock._parentSectionId = sectionBlockId;
		} else {
			const type = payload.replace('new-block:', '');
			if (!componentTemplates[type]) return;
			const bodyBlock = createBlock(type);
			bodyBlock._isNlBodyBlock = true;
			bodyBlock._parentSectionId = sectionBlockId;
			bodyBlock.marginBottom = 0;
			state.blocks.push(bodyBlock);
		}
		render();
	}, true);

	_listEditButtons = createListEditButtons();
	initThemeSwitcher();
	initColorPicker();
	initGuidedTour();
	KlicBuilderShared.bindOptionsPanelClose(closeBlockProps, document.getElementById('blockPropsPanel'));
	document.getElementById('iconDrawerClose').addEventListener('click', closeIconDrawer);
	document.getElementById('iconDrawerBackdrop').addEventListener('click', closeIconDrawer);
	canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	document.body.dataset.canvasSize = state.canvasWidth;
	document.body.dataset.previewDevice = 'pc';
	renderCanvasPanelUI();
	document.getElementById('deviceSwitcher').addEventListener('click', e => {
		const trigger = e.target.closest('#deviceDropdownTrigger');
		const menu = document.getElementById('deviceDropdownMenu');
		if (trigger && menu) {
			menu.hidden = !menu.hidden;
			return;
		}
		const btn = e.target.closest('[data-device]');
		if (btn) {
			setPreviewDevice(btn.dataset.device);
			if (menu) menu.hidden = true;
		}
	});
	document.addEventListener('click', e => {
		if (!e.target.closest('#deviceSwitcher')) {
			const menu = document.getElementById('deviceDropdownMenu');
			if (menu) menu.hidden = true;
		}
	});
	document.addEventListener('click', event => {
		if (!event.target.closest('[data-canvas-size-menu]')) {
			document.querySelectorAll('[data-canvas-size-menu].is-open').forEach(menu => menu.classList.remove('is-open'));
		}
	});

	render();
}

// ?? ?덈궡 ?ъ뼱 ?????????????????????????????????????????????
const TOUR_STEPS = [
	{
		target: '.sidebar',
		title: '템플릿 선택',
		desc: '필터에서 템플릿을 확인한 뒤 원하는 항목을 캔버스로 드래그하거나 추가 버튼을 누르세요.',
		position: 'right'
	},
	{
		target: '.workspace',
		title: '캔버스에 배치',
		desc: '작업 영역에 배치된 템플릿은 클릭해서 선택하고 순서를 바꿀 수 있습니다.',
		position: 'left'
	},
	{
		target: '.builder-block',
		title: '템플릿 편집 컨트롤',
		desc: '<ul class="tour-ctrl-list"><li><i class="ri-settings-3-line"></i> <b>옵션</b> 선택한 템플릿의 세부 설정을 편집합니다.</li><li><i class="ri-file-copy-line"></i> <b>복사</b> 템플릿을 복제합니다.</li><li><i class="ri-close-line"></i> <b>삭제</b> 템플릿을 제거합니다.</li></ul>',
		position: 'bottom'
	}
];

function initGuidedTour() {
	KlicBuilderShared.initGuidedTour({
		steps: TOUR_STEPS,
		beforeStep: index => {
			if (index !== 1 || state.blocks.length !== 0) return;
			const firstType = Object.keys(componentTemplates)[0];
			if (!firstType) return;
			const block = createBlock(firstType);
			state.blocks.push(block);
			render();
		}
	});
}

function initThemeSwitcher() {
	const saved = localStorage.getItem('klicBuilderTheme') || 'purple';
	applyTheme(saved);

	document.getElementById('themeSwitcher')?.addEventListener('click', e => {
		const btn = e.target.closest('.theme-swatch');
		if (!btn) return;
		applyTheme(btn.dataset.theme);
		localStorage.setItem('klicBuilderTheme', btn.dataset.theme);
	});
}

const THEME_COLOR_MAP = {
	purple: { primary: '#6600BF', secondary: '#8A5CEA', accent: '#C0066B' },
	blue:   { primary: '#2870FF', secondary: '#3694FF', accent: '#ED6B00' },
	green:  { primary: '#057734', secondary: '#06A146', accent: '#FFD900' },
	navy:   { primary: '#002454', secondary: '#0A3F85', accent: '#38B218' },
	mint:   { primary: '#268F87', secondary: '#2FCFAF', accent: '#FFA552' },
	orange: { primary: '#E56C01', secondary: '#FF973C', accent: '#003DAD' },
};

function applyTheme(theme) {
	document.body.dataset.theme = theme;
	document.querySelectorAll('.theme-swatch').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.theme === theme);
		btn.setAttribute('aria-pressed', btn.dataset.theme === theme ? 'true' : 'false');
	});
	const colors = THEME_COLOR_MAP[theme];
	if (colors) {
		document.documentElement.style.removeProperty('--color-primary');
		document.documentElement.style.removeProperty('--color-secondary');
		document.documentElement.style.removeProperty('--color-accent');
		syncColorPickers(colors);
	}
}

function syncColorPickers(colors) {
	const map = { cpPrimary: colors.primary, cpSecondary: colors.secondary, cpAccent: colors.accent };
	const swatchMap = { cpPrimary: 'cpSwatchPrimary', cpSecondary: 'cpSwatchSecondary', cpAccent: 'cpSwatchAccent' };
	Object.entries(map).forEach(([id, val]) => {
		const el = document.getElementById(id);
		if (el) el.value = val;
		const sw = document.getElementById(swatchMap[id]);
		if (sw) sw.style.background = val;
	});
}

function initColorPicker() {
	const PICKERS = [
		{ inputId: 'cpPrimary', swatchId: 'cpSwatchPrimary', varName: '--color-primary' },
		{ inputId: 'cpSecondary', swatchId: 'cpSwatchSecondary', varName: '--color-secondary' },
		{ inputId: 'cpAccent', swatchId: 'cpSwatchAccent', varName: '--color-accent' },
	];
	PICKERS.forEach(({ inputId, swatchId, varName }) => {
		const input = document.getElementById(inputId);
		const swatch = document.getElementById(swatchId);
		if (!input) return;
		input.addEventListener('input', () => {
			document.documentElement.style.setProperty(varName, input.value);
			if (swatch) swatch.style.background = input.value;
			document.body.dataset.theme = 'custom';
			document.querySelectorAll('.theme-swatch').forEach(btn => {
				btn.classList.remove('is-active');
				btn.setAttribute('aria-pressed', 'false');
			});
		});
	});
}

window.addEventListener('DOMContentLoaded', function() {
	bindDesignBlockPanelEvents();
	init();
	// 빌더 초기화 완료 신호를 부모 창에 전달
	if (window.parent !== window) {
		window.parent.postMessage({ type: 'builderReady' }, '*');
	}
});

// 부모 창 연동: 빌더 스냅샷 추출 / 복원
window.getBuilderSnapshot = function() {
	return JSON.stringify(createProjectSnapshot());
};

window.restoreBuilderSnapshot = function(jsonStr) {
	try {
		restoreProjectSnapshot(JSON.parse(jsonStr));
	} catch(e) {
		console.error('빌더 스냅샷 복원 실패:', e);
	}
};

// 부모 창에서 JSON 로드 메시지 수신
window.addEventListener('message', function(e) {
	if (e.data && e.data.type === 'loadBuilderSnapshot' && e.data.json) {
		window.restoreBuilderSnapshot(e.data.json);
	}
});
