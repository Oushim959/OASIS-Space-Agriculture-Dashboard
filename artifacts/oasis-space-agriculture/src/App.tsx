import { Children, cloneElement, isValidElement, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowRight, Check, FileUp, Gauge, Lightbulb,
  Menu, Pause, Play, Radio, ShieldCheck, X, Sun, Moon,
} from 'lucide-react';
import ModelViewer from './components/ModelViewer';
import { Link, Router, useLocation } from 'wouter';

type Frame = {
  air: number; rh: number; moisture: number; co2: number; led: number; reservoir: number;
};
type MetricKey = 'moisture' | 'air' | 'vpd';

const frames: Frame[] = [
  { air: 20.1, rh: 64, moisture: 40.2, co2: 950, led: 38, reservoir: 80 },
  { air: 21.5, rh: 58, moisture: 35, co2: 980, led: 42, reservoir: 78 },
  { air: 24.8, rh: 42, moisture: 18.4, co2: 940, led: 52, reservoir: 75 },
  { air: 26.2, rh: 38, moisture: 15, co2: 1100, led: 63.5, reservoir: 72 },
  { air: 21.0, rh: 62, moisture: 38, co2: 960, led: 39, reservoir: 70 },
  { air: 20.5, rh: 65, moisture: 41, co2: 950, led: 37.5, reservoir: 68 },
  { air: 23.0, rh: 48, moisture: 28, co2: 1020, led: 58, reservoir: 65 },
  { air: 25.5, rh: 40, moisture: 16, co2: 1150, led: 64, reservoir: 3.5 },
];
const irrigateProposal = [20, 20, 30, 80, 20, 20, 30, 45];
const lightProposal = [80, 70, 70, 30, 62, 70, 70, 70];
const redBlueProposal = [4.5, 5.5, 4.5, 4.5, 4.5, 5, 4.5, 4.5];
const fanProposal = [70, 70, 80, 80, 55, 40, 80, 80];
const formatTime = (index: number) => {
  const minutes = index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
const vpdFor = (air: number, rh: number) =>
  0.61078 * Math.exp((17.27 * air) / (air + 237.3)) * (1 - rh / 100);

const cropData = {
  potato: {
    name: 'Potato', latin: 'Solanum tuberosum', stage: 'Tuber bulking', medium: 'Martian regolith',
    vpd: [0.8, 1.2], dli: 18, air: [18, 22], moisture: [35, 45],
    risks: 'Perchlorate saturation · capillary waterlogging · root-zone hypoxia',
  },
  tomato: {
    name: 'Dwarf tomato', latin: 'Solanum lycopersicum', stage: 'Fruiting', medium: 'Hydroponic loop',
    vpd: [1.0, 1.4], dli: 22, air: [21, 26], moisture: [40, 50],
    risks: 'Ethylene during flowering · photosynthetic depression from high CO₂',
  },
};
type CropKey = keyof typeof cropData;

function CropPlant({ crop }: { crop: CropKey }) {
  const leaf = (cx: number, cy: number, r: number, c = '#4f8f3a') => <ellipse cx={cx} cy={cy} rx="15" ry="6.5" fill={c} transform={`rotate(${r} ${cx} ${cy})`} />;
  if (crop === 'potato') {
    return (
      <svg className="crop-plant" viewBox="0 0 120 140" role="img" aria-label="Potato plant and tuber illustration">
        <path d="M60 104V40m0 34L40 56m20 28 22-28m-22-2-14-18" fill="none" stroke="#3b7a34" strokeWidth="3" strokeLinecap="round" />
        {leaf(38, 54, 27)}{leaf(82, 54, -35, '#6aa543')}{leaf(44, 36, 40, '#6aa543')}{leaf(66, 58, -45)}{leaf(60, 30, -80, '#3b7a34')}
        <g fill="#9a6fcf"><circle cx="60" cy="24" r="3.5" /><circle cx="68" cy="28" r="3" /></g>
        <path d="M14 104h92" stroke="#8a6a45" strokeWidth="2" strokeDasharray="3 4" />
        <g fill="#d6b27a" stroke="#a9814d" strokeWidth="1.2"><ellipse cx="42" cy="116" rx="10" ry="6.5" /><ellipse cx="62" cy="122" rx="11" ry="7" /><ellipse cx="82" cy="114" rx="8.5" ry="6" /></g>
      </svg>
    );
  }
  return (
    <svg className="crop-plant" viewBox="0 0 120 140" role="img" aria-label="Dwarf tomato plant with fruit illustration">
      <path d="M60 110V36m0 30L36 52m24 26 24-22m-24-2L46 36" fill="none" stroke="#3b7a34" strokeWidth="3" strokeLinecap="round" />
      {leaf(36, 50, 27)}{leaf(84, 54, -35, '#6aa543')}{leaf(46, 34, 40, '#6aa543')}{leaf(70, 66, -45)}
      <g fill="#d4452f" stroke="#a82e1d" strokeWidth="1.2"><circle cx="38" cy="86" r="9" /><circle cx="82" cy="92" r="10" /><circle cx="60" cy="102" r="8" /></g>
      <g fill="#3b7a34"><path d="M32 78l6 4 6-4-6 1zM76 83l6 4 6-4-6 1z" /></g>
      <path d="M14 112h92" stroke="#8a6a45" strokeWidth="2" />
    </svg>
  );
}

const arText: Record<string, string> = {
  'Mission': 'المهمة', 'Architecture': 'البنية', 'Dashboard': 'لوحة البيانات', 'Prototype': 'النموذج الأولي',
  '3D model': 'نموذج ثلاثي الأبعاد', 'Safeguards': 'الضوابط', 'Project': 'المشروع',
  'Closed-loop cultivation · concept demonstrator': 'زراعة بدورة مغلقة · عرض للمفهوم',
  'Grow the harvest': 'ازرع المحصول', 'where': 'حيث', 'soil': 'التربة', 'is scarce.': 'نادرة.',
  'O.A.S.I.S. watches the root zone, the air and the light around potato and dwarf tomato plants, then lets an AI model propose care while plain, inspectable rules decide what is allowed.': 'يراقب O.A.S.I.S. منطقة الجذور والهواء والضوء حول نباتات البطاطس والطماطم القزمية. يقترح نموذج الذكاء الاصطناعي أساليب العناية، بينما تحدد قواعد واضحة وقابلة للفحص ما يُسمح به.',
  'Open plant dashboard': 'افتح لوحة النباتات', 'How the loop works': 'كيف تعمل الدورة',
  '2': '٢', 'crop profiles': 'ملفا محصول', '8': '٨', 'synthetic frames': 'إطارات اصطناعية', '3': '٣', 'hard safeguards': 'ضوابط حازمة',
  '01 / Why plants': '٠١ / لماذا النباتات', 'Fresh food is a mission resource.': 'الغذاء الطازج مورد للمهمة.',
  'Long-duration crews need nutrition, variety and the everyday well-being that comes from tending living things. Yet a habitat has little spare water or power, a tightly coupled atmosphere, and no easy path to replace a crop that fails.': 'تحتاج الطواقم في المهمات الطويلة إلى تغذية متنوعة ورفاه يومي تمنحه رعاية الكائنات الحية. لكن موارد الماء والطاقة محدودة، والغلاف الجوي منظومة مترابطة، واستبدال محصول تالف ليس أمراً سهلاً.',
  'O.A.S.I.S. is a closed-loop cultivation concept for making that growing environment legible and responsive. It links plant-relevant sensing to recommendations, while keeping actuator authority behind a small, inspectable rules layer.': 'O.A.S.I.S. مفهوم للزراعة بدورة مغلقة يجعل بيئة النمو قابلة للفهم والاستجابة. يربط الاستشعار المرتبط بالنبات بالتوصيات، مع إبقاء التحكم بالمشغلات خلف طبقة قواعد محدودة وقابلة للفحص.',
  'A useful AI in a life-support loop knows when it is not in charge.': 'يعرف الذكاء الاصطناعي المفيد في منظومة دعم الحياة متى لا تكون له سلطة القرار.',
  'Water is a system, not a tap': 'الماء منظومة وليس صنبوراً', 'Closed loops demand careful delivery. Too little stresses a crop; excess can saturate media and starve roots of oxygen.': 'تتطلب الدورات المغلقة توصيلاً دقيقاً للماء. القليل يجهد المحصول، والكثير قد يشبع الوسط ويحرم الجذور من الأكسجين.',
  'Atmosphere couples everything': 'الغلاف الجوي يربط كل شيء', 'Humidity, temperature and CO₂ interact with transpiration and photosynthesis. A single threshold cannot describe the whole canopy.': 'تتفاعل الرطوبة والحرارة وثاني أكسيد الكربون مع النتح والبناء الضوئي. ولا تكفي عتبة واحدة لوصف المجموع الخضري.',
  'Power and heat are mission constraints': 'الطاقة والحرارة قيدان للمهمة', 'Light and fans are useful only within hardware limits. Thermal excursions need an explicit response path.': 'لا تفيد الإضاءة والمراوح إلا ضمن حدود الأجهزة. وتتطلب الارتفاعات الحرارية استجابة محددة.',
  'Crop failure has a long tail': 'لتعثر المحصول تبعات طويلة', 'Plant condition affects food variety and crew routine. The aim is better visibility and bounded support, not a promise of autonomy.': 'تؤثر حالة النبات في تنوع الغذاء وروتين الطاقم. الهدف وضوح أكبر ودعم محدود، لا وعد بالاستقلالية.',
  '02 / Decision chain': '٠٢ / تسلسل القرار', 'One loop. Two kinds of intelligence.': 'دورة واحدة. نوعان من الذكاء.',
  'The language model reasons over a snapshot and proposes a structured response. Deterministic validation remains between every proposal and the actuator layer.': 'يستدل النموذج اللغوي من لقطة للبيانات ويقترح استجابة منظمة. وتظل عملية تحقق حتمية فاصلة بين كل اقتراح وطبقة المشغلات.',
  'Sense': 'استشعار', 'Derive': 'اشتقاق', 'Propose': 'اقتراح', 'Validate': 'تحقق', 'Act': 'تنفيذ',
  '03 / Crop context': '٠٣ / سياق المحاصيل', 'Two configured profiles. No invented targets.': 'ملفان مُعدّان. دون أهداف مختلقة.',
  'Targets are notebook profile values, not universal agronomic prescriptions. A real mission system would need cultivar-, medium- and phase-specific validation.': 'الأهداف قيم ملفات الدفتر، وليست وصفات زراعية عامة. يحتاج نظام المهمة الفعلي إلى تحقق خاص بالصنف والوسط ومرحلة النمو.',
  '04 / Prototype directions': '٠٤ / اتجاهات التصميم', 'A habitat drawn as a working system.': 'تصور لبيئة زراعة كنظام متكامل.',
  'Conceptual subsystem directions for a compact, sealed growth volume. Physical architecture and component selection remain open design work.': 'اتجاهات مفاهيمية للأنظمة الفرعية داخل حيز نمو مدمج ومحكم. ما تزال البنية المادية واختيار المكونات قيد الدراسة.',
  '05 / Model bay': '٠٥ / مساحة النموذج', 'The built geometry belongs here.': 'هنا موضع الهندسة الفعلية.',
  'A reserved presentation area for the actual CAD export. The diagram is an original system cutaway—not a fabricated 3D model or completed prototype.': 'مساحة مخصصة لعرض ملف CAD الفعلي. الرسم مقطع توضيحي للنظام، وليس نموذجاً ثلاثي الأبعاد مصنوعاً أو نموذجاً أولياً مكتملاً.',
  '06 / Safety boundary': '٠٦ / حدود السلامة', 'Small rules.': 'قواعد محدودة.', 'Honest claims.': 'وادعاءات صادقة.',
  '07 / Event & acknowledgements': '٠٧ / الفعالية والإشادات', 'Project and partner credits.': 'المشروع والجهات المساهمة.',
  'Potato': 'بطاطس', 'Dwarf tomato': 'طماطم قزمية', 'Tuber bulking': 'تضخم الدرنات', 'Fruiting': 'الإثمار',
  'Life, in the loop.': 'الحياة ضمن الدورة.', 'Plant health is habitat health.': 'صحة النبات من صحة البيئة.',
  'Select plant': 'اختر النبات', 'Pause replay': 'إيقاف الإعادة مؤقتاً', 'Play replay': 'تشغيل الإعادة',
  'Profile configured': 'الملف مُعدّ', 'signals outside range': 'إشارات خارج النطاق', 'Signals within profile': 'الإشارات ضمن الملف',
  'Three measured or derived signals compared with this crop profile.': 'مقارنة ثلاث إشارات مقاسة أو مشتقة بملف هذا المحصول.',
  'Targets are configured; no tomato sensor run is available.': 'الأهداف مُعدّة؛ لا تتوفر قراءة حساسات للطماطم.',
  'OFFLINE NOTEBOOK': 'إعادة تشغيل محلية', 'PROFILE ONLY · NO RUN': 'ملف فقط · لا توجد قراءة', 'NO REPLAY FRAME': 'لا يوجد إطار إعادة',
  'Fresh food is part of life support.': 'الغذاء الطازج جزء من دعم الحياة.',
  'Plant signals': 'إشارات النبات', 'Air temperature': 'درجة حرارة الهواء', 'Substrate moisture': 'رطوبة الوسط الزراعي',
  'Derived VPD': 'عجز ضغط البخار المحسوب', 'Profile range': 'نطاق الملف', 'Within profile': 'ضمن الملف',
  'Below profile': 'أقل من نطاق الملف', 'Above profile': 'أعلى من نطاق الملف', 'No reading recorded': 'لا توجد قراءة مسجلة',
  'Atmosphere & system readings': 'قراءات الغلاف الجوي والنظام', 'Relative humidity': 'الرطوبة النسبية',
  'CO₂ concentration': 'تركيز ثاني أكسيد الكربون', 'LED temperature': 'حرارة مصباح LED',
  'Reservoir level': 'مستوى الخزان', 'Not recorded': 'غير مسجل', '4 recorded channels': '٤ قنوات مسجلة',
  'No tomato telemetry recorded': 'لا توجد بيانات قياس للطماطم',
  'Model-to-control pipeline': 'مسار النموذج إلى التحكم', 'offline notebook replay': 'إعادة تشغيل دفتر محلية',
  'profile only': 'ملف فقط', 'Stored notebook output for this frame; no live LLM call.': 'مخرجات محفوظة من الدفتر لهذا الإطار؛ لا يوجد اتصال حي بالنموذج.',
  'No recorded sensor run or model output exists for this crop.': 'لا تتوفر قراءة حساسات مسجلة أو مخرجات نموذج لهذا المحصول.',
  'Sensor snapshot': 'لقطة الحساسات', 'LLM proposal': 'اقتراح النموذج اللغوي', 'Rule review': 'مراجعة القواعد',
  'Human approval': 'موافقة بشرية', 'Hardware': 'الأجهزة', 'Stored output': 'مخرجات محفوظة',
  'Results below': 'النتائج أدناه', 'Not connected': 'غير متصل', 'Not sent': 'لم تُرسل',
  'No run recorded': 'لا توجد إعادة مسجلة', 'Unavailable': 'غير متاح', 'Not run': 'لم يُشغّل',
  'Control': 'التحكم', 'Recorded proposal': 'الاقتراح المسجل', 'Deterministic rule result': 'نتيجة القاعدة الحتمية',
  'Irrigation volume': 'كمية الري', 'Light intensity': 'شدة الإضاءة', 'Red : blue ratio': 'نسبة الأحمر إلى الأزرق',
  'Fan duty': 'تشغيل المروحة', 'Not checked': 'لم يُتحقق منه', 'No rule applied': 'لم تُطبق قاعدة',
  'Signal history': 'سجل الإشارات', 'Signal': 'الإشارة', 'Replay position': 'موضع الإعادة',
  'No samples recorded': 'لا توجد عينات مسجلة', 'Technical details': 'تفاصيل تقنية',
  'Deterministic checks in replay': 'الفحوص الحتمية في الإعادة', 'LED thermal cap': 'حد حرارة LED',
  'Low reservoir interlock': 'قفل مستوى الخزان المنخفض', 'Per-event irrigation cap': 'حد الري لكل مرة',
  'No configured rule changed this replay frame.': 'لم تغيّر أي قاعدة مُعدة هذا الإطار.',
  'Rule outcomes are unavailable without a recorded run for this plant.': 'نتائج القواعد غير متاحة دون قراءة مسجلة لهذا النبات.',
  'Project overview': 'نظرة عامة على المشروع', 'Back to dashboard top ↑': 'العودة إلى أعلى اللوحة ↑',
  'Back to top ↑': 'العودة إلى الأعلى ↑', 'Safety notes': 'ملاحظات السلامة',
  'LOCAL MODEL PREVIEW': 'معاينة نموذج محلي', 'Choose local model': 'اختر نموذجاً محلياً',
  'Clear model': 'إزالة النموذج', 'Prototype model pending': 'النموذج ثلاثي الأبعاد غير متاح بعد',
  'Potato · offline notebook replay': 'بطاطس · إعادة تشغيل دفتر محلية',
  'Dwarf tomato · profile only': 'طماطم قزمية · ملف فقط',
  '8 synthetic frames': '٨ إطارات اصطناعية', '2 crop profiles': 'ملفا محصول',
};

const arMore: Record<string, string> = {
  'ORBITAL ADAPTIVE SMART': 'الري الذكي التكيفي المداري',
  'IRRIGATION & SUSTENANCE': 'والإرواء والاستدامة',
  'O.A.S.I.S. / Crop observation': 'O.A.S.I.S. / رصد المحاصيل',
  'Martian regolith': 'الثرى المريخي', 'Hydroponic loop': 'دورة زراعة مائية',
  'TUBER CROP': 'محصول درني', 'FRUITING CROP': 'محصول مثمر',
  'Profile targets': 'أهداف الملف',
  'OFFLINE NOTEBOOK': 'دفتر محلي دون اتصال', 'NO REPLAY FRAME': 'لا يوجد إطار إعادة',
  'Frame': 'الإطار', 'No tomato telemetry recorded': 'لا توجد بيانات قياس مسجلة للطماطم',
  'No recorded sensor run or model output exists for this crop.': 'لا توجد قراءة حساسات أو مخرجات نموذج مسجلة لهذا المحصول.',
  'Potato notebook replay · 12 Oct 2026 · 15-minute samples': 'إعادة دفتر البطاطس · ١٢ أكتوبر ٢٠٢٦ · عينات كل ١٥ دقيقة',
  'Dwarf tomato profile · no telemetry run recorded': 'ملف الطماطم القزمية · لا توجد إعادة قياس مسجلة',
  'Recorded value': 'القيمة المسجلة', 'Profile range': 'نطاق الملف', 'Selected frame': 'الإطار المحدد',
  'Light intensity': 'شدة الضوء',
  'Signal history': 'سجل الإشارات', 'No dwarf tomato sensor run or history is available.': 'لا تتوفر قراءة حساسات أو سجل للطماطم القزمية.',
  'DLI TARGET': 'هدف التكامل الضوئي اليومي', 'VPD WINDOW': 'نطاق عجز ضغط البخار',
  'AIR TEMPERATURE': 'درجة حرارة الهواء', 'SUBSTRATE MOISTURE': 'رطوبة الوسط الزراعي',
  'Watch for:': 'مخاطر محتملة:', 'Future crop expansion:': 'توسّع المحاصيل مستقبلاً:',
  'radish, microgreens and lettuce are ideas only—not configured profiles, with no targets asserted here.': 'الفجل والخضراوات الدقيقة والخس أفكار فقط، وليست ملفات مُعدة ولا توجد أهداف محددة لها.',
  '04 / Prototype direction': '٠٤ / اتجاه التصميم', 'Designed as a habitat system, not a planter.': 'تصميم كنظام موئل، لا كوعاء زراعة.',
  'Candidate subsystem directions': 'اتجاهات الأنظمة الفرعية المحتملة', 'Environment sensing': 'استشعار البيئة',
  'Atmosphere + observation': 'الغلاف الجوي والرصد', 'Lighting and climate': 'الإضاءة والمناخ',
  'Water and growth media': 'الماء وأوساط النمو', 'Embedded compute and link': 'الحوسبة المضمنة والاتصال',
  'Structure': 'الهيكل', 'CANDIDATE COMPONENTS': 'مكونات مرشحة', 'DESIGN OPTIONS': 'خيارات تصميم',
  'CONCEPT STUDY': 'دراسة مفاهيمية', 'NOT SELECTED': 'لم يتم الاختيار',
  'O.A.S.I.S. habitat cutaway': 'مقطع موئل O.A.S.I.S.', 'CONCEPT / NOT BUILT': 'مفهوم / لم يُبنَ',
  'ILLUSTRATIVE ARCHITECTURE · COMPONENTS / PACKAGING NOT SELECTED': 'بنية توضيحية · لم تُحدد المكونات أو طريقة التعبئة',
  'CAD / ASSET SLOT': 'موضع ملف CAD / الأصول', 'Bring the real habitat into the story.': 'أضف التصميم الفعلي للموئل.',
  'Choose a .glb or .gltf model file.': 'اختر ملف نموذج بامتداد ‎.glb أو ‎.gltf.',
  'This local preview supports model files up to 75 MB.': 'تدعم المعاينة المحلية ملفات نماذج حتى ٧٥ ميغابايت.',
  'Choose local model': 'اختر نموذجاً محلياً', 'Clear model': 'إزالة النموذج',
  'No model selected · browser-local file picker only': 'لم يُحدد نموذج · اختيار ملف محلي من المتصفح فقط',
  'Outline slot · no CAD model loaded': 'موضع تخطيطي · لم يُحمّل نموذج CAD',
  'Prototype model pending': 'نموذج التصميم غير متاح بعد',
  '06 / Safety boundary': '٠٦ / حدود السلامة', 'Known limits · current demo': 'الحدود المعروفة · العرض الحالي',
  'LED thermal cap': 'حد حرارة LED', 'Low reservoir interlock': 'قفل انخفاض الخزان',
  'Per-event irrigation cap': 'حد الري لكل حدث', 'Synthetic 8-frame sequence': 'تسلسل اصطناعي من ٨ إطارات',
  'One crop at a time': 'محصول واحد في كل مرة', 'No live sensors or actuators': 'لا توجد حساسات أو مشغلات حية',
  'No live model / fallback path on this page': 'لا يوجد نموذج حي أو مسار احتياطي في هذه الصفحة',
  'Authority boundary:': 'حدود الصلاحية:',
  'the model is a proposer, not a direct authority over actuators. The current website is an offline replay—there are no live sensors, API calls, or actuator commands.': 'النموذج يقترح ولا يتحكم مباشرة بالمشغلات. الموقع الحالي إعادة تشغيل محلية؛ لا توجد حساسات حية أو اتصالات API أو أوامر للمشغلات.',
  'No tomato sensor run is available.': 'لا تتوفر قراءة حساسات للطماطم.',
  'ORBITAL ADAPTIVE SMART IRRIGATION & SUSTENANCE': 'الري الذكي التكيفي المداري والإرواء والاستدامة',
  'Crop observation': 'رصد المحاصيل', 'Air temperature': 'درجة حرارة الهواء',
  'Derived VPD': 'عجز ضغط البخار المحسوب',
  'Temperature': 'درجة الحرارة', 'Human approval': 'موافقة بشرية',
  'Pause replay': 'إيقاف الإعادة مؤقتاً', 'Play replay': 'تشغيل الإعادة',
  'Model-to-control pipeline': 'مسار النموذج إلى التحكم',
  'The language model reasons over a snapshot and proposes a structured response. Deterministic validation remains between every proposal and the actuator layer.': 'يستدل النموذج اللغوي من لقطة بيانات ويقترح استجابة منظمة. ويبقى التحقق الحتمي فاصلاً بين كل اقتراح وطبقة المشغلات.',
  'Air temp, RH, substrate moisture, CO₂, LED temperature and reservoir level.': 'حرارة الهواء والرطوبة النسبية ورطوبة الوسط الزراعي وثاني أكسيد الكربون وحرارة LED ومستوى الخزان.',
  'Calculate VPD from air temperature and relative humidity using Tetens approximation.': 'حساب عجز ضغط البخار من حرارة الهواء والرطوبة النسبية باستخدام تقريب تيتنز.',
  'LLM suggests irrigation ml, red:blue ratio, light intensity, fan duty and rationale.': 'يقترح النموذج اللغوي كمية الري ونسبة الأحمر إلى الأزرق وشدة الضوء وتشغيل المروحة ومبرراته.',
  'Plain rules cap or block selected outputs. Every intervention is inspectable.': 'تحدد قواعد واضحة سقف بعض المخرجات أو تمنعها. وكل إجراء قابل للفحص.',
  'Only the validated values are eligible for a future actuator interface.': 'القيم التي اجتازت التحقق وحدها مؤهلة للاتصال بمشغلات مستقبلية.',
  'Target window shaded · 15 min sample cadence': 'النطاق المستهدف مظلل · عينة كل ١٥ دقيقة',
  'No reading recorded': 'لا توجد قراءة مسجلة', 'Not recorded': 'غير مسجل', 'Not run': 'لم يُشغّل',
  'Not connected': 'غير متصل', 'Not sent': 'لم يُرسل', 'Not checked': 'لم يُتحقق منه',
  'PROFILE ONLY · NO RUN': 'ملف فقط · لا توجد إعادة',
  'No run recorded': 'لا توجد إعادة مسجلة', 'Stored output': 'مخرجات محفوظة',
  'Results below': 'النتائج أدناه', 'Unavailable': 'غير متاح',
  'Model / provider': 'النموذج / المزوّد', 'Mean latency': 'متوسط زمن الاستجابة',
  'Valid JSON': 'JSON صالح', 'Notebook observation': 'ملاحظة الدفتر',
  'LOCAL MODEL PREVIEW': 'معاينة نموذج محلي', 'DRAG TO ORBIT · SCROLL TO ZOOM': 'اسحب للدوران · مرر للتكبير',
  'MODEL': 'النموذج', 'O.A.S.I.S. · Offline synthetic telemetry replay · No live control': 'O.A.S.I.S. · إعادة بيانات قياس اصطناعية دون اتصال · لا تحكم حي',
  'NO LIVE CONTROL': 'لا يوجد تحكم حي',
  'A habitat shown in section.': 'مقطع توضيحي للموئل.',
  'Illustrative habitat cutaway': 'مقطع توضيحي للموئل',
  'Switch language to Arabic': 'التبديل إلى العربية',
  'Switch language to English': 'التبديل إلى الإنجليزية',
  'Switch to dark mode': 'التبديل إلى الوضع الداكن',
  'Switch to light mode': 'التبديل إلى الوضع الفاتح',
  'Illustrative outline of a modular cultivation habitat': 'رسم توضيحي لموئل زراعي معياري',
  'Annotated modular crop habitat cutaway showing lighting, sensing, crop zone, reservoir and control unit': 'مقطع توضيحي لموئل زراعي معياري يوضح الإضاءة والاستشعار ومنطقة المحصول والخزان ووحدة التحكم',
  'Potato plant and tuber illustration': 'رسم توضيحي لنبات البطاطس ودرناته',
  'Dwarf tomato plant with fruit illustration': 'رسم توضيحي لنبات طماطم قزمية مثمرة',
  'Potato plant growing in a terracotta-colored substrate pot': 'نبات بطاطس ينمو في أصيص بوسط زراعي بلون الطين',
  'Dwarf tomato plant bearing ripe fruit in a hydroponic habitat vessel': 'نبات طماطم قزمية يحمل ثماراً ناضجة في وعاء زراعة مائية',
  'Astronaut working at a plant experiment station aboard the International Space Station': 'رائدة فضاء تعمل في محطة تجارب نباتية على متن محطة الفضاء الدولية',
  'Plant research being tended inside a softly lit orbital growth chamber': 'رعاية أبحاث نباتية داخل حجرة نمو مدارية مضاءة بلطف',
  'Replaying stored synthetic frames; no live sensors or actuator commands are connected.': 'إعادة تشغيل إطارات اصطناعية محفوظة؛ لا توجد حساسات حية أو أوامر مشغلات متصلة.',
  'Air temperature across eight synthetic telemetry frames. Target': 'درجة حرارة الهواء عبر ثمانية إطارات اصطناعية. الهدف',
  'Replay position': 'موضع الإعادة',
  'Choose replay frame': 'اختر إطار الإعادة',
  'Open the offline replay': 'افتح إعادة التشغيل المحلية',
  'Main navigation': 'التنقل الرئيسي',
  'Signal context': 'سياق الإشارة',
  'Signals outside profile': 'إشارات خارج نطاق الملف',
  'FRAME': 'الإطار',
  'No run-specific rule results': 'لا توجد نتائج قواعد خاصة بإعادة تشغيل',
  'A living system, made legible.': 'نظام حي، واضح المعالم.',
  'Explore the crop-by-crop replay: a transparent view of recorded synthetic frames, configured profiles and the rules applied to proposed controls.': 'استكشف إعادة التشغيل لكل محصول: عرض شفاف لإطارات اصطناعية مسجلة وملفات مُعدة والقواعد المطبقة على مقترحات التحكم.',
  'O.A.S.I.S. / Field notes': 'O.A.S.I.S. / ملاحظات ميدانية',
  'Frame 01': 'الإطار ٠١',
  'Root zone': 'منطقة الجذور',
  'LED lighting': 'إضاءة LED',
  'Control unit': 'وحدة التحكم',
  'Reservoir': 'الخزان',
  'Space Lead 2026 · offline synthetic demo': 'مسار الفضاء ٢٠٢٦ · عرض اصطناعي محلي',
};
const arAdditional: Record<string, string> = {
  'The language model reasons over a snapshot and proposes a structured response. Deterministic validation remains between every proposal and the actuator layer.': 'يستدل النموذج اللغوي من لقطة بيانات ويقترح استجابة منظمة. ويبقى التحقق الحتمي فاصلاً بين كل اقتراح وطبقة المشغلات.',
  'Air temp, RH, substrate moisture, CO₂, LED temperature and reservoir level.': 'حرارة الهواء والرطوبة النسبية ورطوبة الوسط الزراعي وثاني أكسيد الكربون وحرارة LED ومستوى الخزان.',
  'Calculate VPD from air temperature and relative humidity using Tetens approximation.': 'يُحسب عجز ضغط البخار من حرارة الهواء والرطوبة النسبية باستخدام تقريب تيتنز.',
  'LLM suggests irrigation ml, red:blue ratio, light intensity, fan duty and rationale.': 'يقترح النموذج اللغوي كمية الري ونسبة الأحمر إلى الأزرق وشدة الضوء وتشغيل المروحة ومبرراته.',
  'Plain rules cap or block selected outputs. Every intervention is inspectable.': 'تضع قواعد واضحة حدوداً لبعض المخرجات أو تمنعها. ويمكن فحص كل إجراء.',
  'Only the validated values are eligible for a future actuator interface.': 'القيم التي اجتازت التحقق وحدها مؤهلة للاتصال بواجهة مشغلات مستقبلية.',
  'Authority boundary:': 'حدود الصلاحية:',
  'the model is a proposer, not a direct authority over actuators. The current website is an offline replay—there are no live sensors, API calls, or actuator commands.': 'النموذج يقترح ولا يتحكم مباشرة بالمشغلات. الموقع الحالي إعادة تشغيل محلية؛ لا توجد حساسات حية أو اتصالات API أو أوامر للمشغلات.',
  'Targets are notebook profile values, not universal agronomic prescriptions. A real mission system would need cultivar-, medium- and phase-specific validation.': 'الأهداف قيم ملفات الدفتر وليست توصيات زراعية عامة. يحتاج نظام المهمة الفعلي إلى تحقق خاص بالصنف والوسط ومرحلة النمو.',
  'Long-duration crews need nutrition, variety and the everyday well-being that comes from tending living things. Yet a habitat has little spare water or power, a tightly coupled atmosphere, and no easy path to replace a crop that fails.': 'تحتاج الطواقم في المهمات الطويلة إلى تغذية متنوعة ورفاه يومي تمنحه رعاية الكائنات الحية. لكن الماء والطاقة محدودان، والغلاف الجوي منظومة مترابطة، ولا يسهل استبدال محصول تالف.',
  'O.A.S.I.S. is a closed-loop cultivation concept for making that growing environment legible and responsive. It links plant-relevant sensing to recommendations, while keeping actuator authority behind a small, inspectable rules layer.': 'O.A.S.I.S. مفهوم للزراعة بدورة مغلقة يجعل بيئة النمو قابلة للفهم والاستجابة. يربط الاستشعار المرتبط بالنبات بالتوصيات، مع إبقاء سلطة المشغلات خلف طبقة قواعد محدودة وقابلة للفحص.',
  'Closed loops demand careful delivery. Too little stresses a crop; excess can saturate media and starve roots of oxygen.': 'تتطلب الدورات المغلقة توصيلاً دقيقاً للماء. القليل يجهد المحصول، والكثير قد يشبع الوسط ويحرم الجذور من الأكسجين.',
  'Humidity, temperature and CO₂ interact with transpiration and photosynthesis. A single threshold cannot describe the whole canopy.': 'تتفاعل الرطوبة والحرارة وثاني أكسيد الكربون مع النتح والبناء الضوئي. ولا تكفي عتبة واحدة لوصف المجموع الخضري.',
  'Light and fans are useful only within hardware limits. Thermal excursions need an explicit response path.': 'لا تفيد الإضاءة والمراوح إلا ضمن حدود الأجهزة. وتتطلب الارتفاعات الحرارية استجابة محددة.',
  'Plant condition affects food variety and crew routine. The aim is better visibility and bounded support, not a promise of autonomy.': 'تؤثر حالة النبات في تنوع الغذاء وروتين الطاقم. الهدف وضوح أكبر ودعم محدود، لا وعد بالاستقلالية.',
  'Fresh food is part of life support.': 'الغذاء الطازج جزء من دعم الحياة.',
  'Conceptual subsystem directions for a compact, sealed growth volume. Physical architecture and component selection remain open design work.': 'اتجاهات مفاهيمية للأنظمة الفرعية داخل حيز نمو مدمج ومحكم. ما تزال البنية المادية واختيار المكونات قيد الدراسة.',
  'A reserved presentation area for the actual CAD export. The diagram is an original system cutaway—not a fabricated 3D model or completed prototype.': 'مساحة مخصصة لعرض ملف CAD الفعلي. الرسم مقطع توضيحي للنظام، وليس نموذجاً ثلاثي الأبعاد مصنوعاً أو نموذجاً أولياً مكتملاً.',
  'DHT22, BME280 or SHT3x for temperature / RH; substrate moisture sensor; TSL2591 or photoresistor for light.': 'خيارات استشعار الحرارة والرطوبة: DHT22 أو BME280 أو SHT3x؛ حساس رطوبة للوسط الزراعي؛ وTSL2591 أو مقاومة ضوئية للضوء.',
  'SCD30 / SGP30 CO₂ or air-quality sensor, with a small camera for visual crop checks.': 'حساس SCD30 أو SGP30 لثاني أكسيد الكربون أو جودة الهواء، مع كاميرا صغيرة للفحص البصري للمحصول.',
  'PWM 450 nm blue and 660 nm deep-red LEDs; far-red and spectrum control are options. Fan direction remains open.': 'مصابيح LED زرقاء بطول ٤٥٠ نانومتراً وحمراء عميقة بطول ٦٦٠ نانومتراً بتحكم PWM؛ ويظل الضوء الأحمر البعيد وخيارات الطيف قيد الدراسة.',
  'Peristaltic micro-pump / mister; aeroponic, hydroponic (rockwool / sponge), or wick-based media under study.': 'مضخة تمعجية صغيرة أو مرذاذ؛ وتُدرس خيارات الزراعة الهوائية والمائية (صوف صخري أو إسفنج) والفتائل.',
  'ESP32 or Raspberry Pi class controller; MQTT, REST or WebSocket are candidate communication paths.': 'متحكم من فئة ESP32 أو Raspberry Pi؛ وتُدرس MQTT وREST وWebSocket كمسارات اتصال محتملة.',
  'Compact deployable origami, telescoping or modular sealed chamber options. No flight qualification is claimed.': 'خيارات حجرة محكمة مدمجة قابلة للنشر: مطوية أو تلسكوبية أو معيارية. لا يوجد ادعاء بتأهيلها للطيران.',
  'Load the team’s .glb or self-contained .gltf export to inspect it here. The selected file stays in this browser; it is not uploaded.': 'حمّل ملف ‎.glb أو ملف ‎.gltf مكتفياً ذاتياً لمعاينته هنا. يبقى الملف المحدد في هذا المتصفح ولا يُرفع.',
  'The current vector is an original concept illustration, not a finished build.': 'الرسم المتجهي الحالي توضيح مفاهيمي أصلي، وليس بناءً مكتملاً.',
  'In this replay, each rule is visible next to the proposed and applied values. A production design would need hazard analysis, fault detection, actuator feedback, and validation across crop stage, hardware and mission conditions.': 'في هذه الإعادة تظهر كل قاعدة بجوار القيم المقترحة والمطبقة. ويتطلب التصميم التشغيلي تحليل المخاطر واكتشاف الأعطال والتغذية الراجعة للمشغلات والتحقق عبر مراحل المحصول والأجهزة وظروف المهمة.',
  'If LED temperature is at least 60°C, reduce proposed light intensity to no more than 15%.': 'إذا بلغت حرارة LED ‏٦٠°م أو تجاوزتها، تُخفض شدة الضوء المقترحة إلى ١٥٪ كحد أقصى.',
  'If reservoir level is below 5%, force irrigation volume to zero.': 'إذا انخفض مستوى الخزان عن ٥٪، تُجعل كمية الري صفراً.',
  'If proposed irrigation exceeds 150 ml, cap the applied amount at 150 ml.': 'إذا تجاوز الري المقترح ١٥٠ مل، تُحدد الكمية المطبقة عند ١٥٠ مل.',
  'Readings to hardware pipeline': 'مسار القراءات إلى الأجهزة',
  'No recorded sensor run or model output exists for this crop.': 'لا توجد قراءة حساسات أو مخرجات نموذج مسجلة لهذا المحصول.',
  'Below profile': 'أقل من نطاق الملف',
  'Above profile': 'أعلى من نطاق الملف',
  'Within profile': 'ضمن نطاق الملف',
  'Choose a .glb or .gltf model file.': 'اختر ملف نموذج بامتداد ‎.glb أو ‎.gltf.',
  'This local preview supports model files up to 75 MB.': 'تدعم المعاينة المحلية ملفات نماذج حتى ٧٥ ميغابايت.',
  'Dark': 'داكن',
  'Light': 'فاتح',
  'Open navigation': 'فتح قائمة التنقل',
  'Close navigation': 'إغلاق قائمة التنقل',
  'Pause replay': 'إيقاف الإعادة مؤقتاً',
  'Play replay': 'تشغيل الإعادة',
  'Select plant': 'اختر النبات',
  '1 / 8': '١ / ٨',
  'FIELD NOTE 01': 'ملاحظة ميدانية ٠١',
  'Plants in a closed habitat': 'النباتات في موئل مغلق',
  'O.A.S.I.S. · cultivation study': 'O.A.S.I.S. · دراسة زراعية',
  'Perchlorate saturation · capillary waterlogging · root-zone hypoxia': 'تراكم البيركلورات · تشبع الوسط بالماء · نقص الأكسجين في منطقة الجذور',
  'Ethylene during flowering · photosynthetic depression from high CO₂': 'الإيثيلين أثناء الإزهار · تراجع البناء الضوئي بسبب ارتفاع ثاني أكسيد الكربون',
  'At ≥60°C, cap proposed light intensity at 15%.': 'عند ≥٦٠°م، تُحدد شدة الضوء المقترحة عند ١٥٪ كحد أقصى.',
  'Below 5%, set irrigation volume to zero.': 'تحت ٥٪، تُضبط كمية الري على صفر.',
  'Limit an irrigation event to 150 ml.': 'تُحدد كمية الري لكل مرة عند ١٥٠ مل.',
  'Unsupported or invalid model file.': 'ملف النموذج غير مدعوم أو غير صالح.',
  'The model has no visible geometry.': 'لا يحتوي النموذج على أشكال هندسية مرئية.',
  'Preparing local model preview…': 'جارٍ إعداد معاينة النموذج المحلي…',
  'Rule-adjusted': 'عُدلت بواسطة القاعدة',
  'RULE-ADJUSTED': 'عُدلت بواسطة القاعدة',
  'No live control': 'لا يوجد تحكم حي',
};
const arJournal: Record<string, string> = {
  Mission: 'المهمة',
  'Crop profiles': 'ملفات المحاصيل',
  'Decision chain': 'تسلسل القرار',
  'Safeguards': 'الضوابط',
  Credits: 'الإشادات',
  'Plant-first habitat concept': 'مفهوم موئل يبدأ بالنبات',
  'Food,': 'الغذاء،',
  'beyond Earth.': 'خارج الأرض.',
  'A cultivation concept exploring how food, water, atmosphere and power can work together in a closed habitat.': 'مفهوم زراعي يستكشف كيف يعمل الغذاء والماء والغلاف الجوي والطاقة معاً داخل موئل مغلق.',
  'Explore the concept': 'استكشف الفكرة',
  'Replay the data': 'أعد تشغيل البيانات',
  'FIELD NOTES / 01': 'ملاحظات ميدانية / ٠١',
  'Root zone · air · light · water': 'منطقة الجذور · الهواء · الضوء · الماء',
  '01 / The growing question': '٠١ / سؤال الزراعة',
  'Fresh food is part of the habitat.': 'الغذاء الطازج جزء من الموئل.',
  'For a long-duration crew, crops bring nutrition, variety and the everyday rhythm of tending living things. A spacecraft habitat, meanwhile, has little spare water or power and an atmosphere where each variable affects the next.': 'تمنح المحاصيل الطاقم في المهمات الطويلة تغذية متنوعة وإيقاعاً يومياً لرعاية الحياة. وفي الوقت نفسه، لا يملك موئل المركبة ماءً أو طاقة فائضين، كما يؤثر كل متغير في الغلاف الجوي على غيره.',
  'Four constraints, one living system': 'أربعة قيود، ونظام حي واحد',
  'Plant-only cultivation module · concept visual': 'وحدة زراعة نباتية · تصور مفاهيمي',
  'FIELD NOTE 01': 'ملاحظة ميدانية ٠١',
  'Grow with the limits in view.': 'ازرع مع إبقاء الحدود واضحة.',
  'O.A.S.I.S. links plant-relevant sensing to care recommendations. The model may propose; a small, inspectable rules layer decides what may proceed.': 'يربط O.A.S.I.S. الاستشعار المرتبط بالنبات بتوصيات العناية. يمكن للنموذج أن يقترح، لكن طبقة قواعد محدودة وقابلة للفحص هي التي تحدد ما يمكن تنفيذه.',
  'A useful model knows when it is not in charge.': 'يعرف النموذج المفيد متى لا يكون صاحب القرار.',
  '02 / Habitat constraints': '٠٢ / قيود الموئل',
  'Every resource touches the roots.': 'كل مورد يصل أثره إلى الجذور.',
  'Growing well means balancing the whole environment, not optimizing one reading in isolation.': 'يتطلب النمو المتوازن ضبط البيئة بأكملها، لا تحسين قراءة واحدة بمعزل عن غيرها.',
  '01 / WATER': '٠١ / الماء',
  'Deliver carefully.': 'إيصال محسوب.',
  'Too little water stresses a crop. Too much can saturate its medium and leave roots short of oxygen.': 'قلة الماء تجهد المحصول. وزيادته قد تشبع الوسط الزراعي وتحرم الجذور من الأكسجين.',
  '02 / ATMOSPHERE': '٠٢ / الغلاف الجوي',
  'Read the canopy.': 'اقرأ حالة المجموع الخضري.',
  'Humidity, temperature and CO₂ interact with transpiration and photosynthesis. One threshold cannot tell the whole story.': 'تتفاعل الرطوبة والحرارة وثاني أكسيد الكربون مع النتح والبناء الضوئي. ولا تروي عتبة واحدة القصة كاملة.',
  '03 / POWER & HEAT': '٠٣ / الطاقة والحرارة',
  'Stay within limits.': 'التزم بالحدود.',
  'Lighting and fans help plants, but draw power and produce heat. Selected outputs are bounded by explicit rules.': 'تفيد الإضاءة والمراوح النباتات، لكنها تستهلك الطاقة وتولد الحرارة. وتخضع بعض المخرجات لقواعد محددة.',
  '04 / FOOD': '٠٤ / الغذاء',
  'Protect the harvest.': 'حافظ على المحصول.',
  'Crop condition shapes food variety and crew routine. O.A.S.I.S. aims for clearer visibility, not a promise of autonomy.': 'تؤثر حالة المحصول في تنوع الغذاء وروتين الطاقم. يهدف O.A.S.I.S. إلى وضوح أكبر، لا إلى وعد بالاستقلالية.',
  '03 / Decision chain': '٠٣ / تسلسل القرار',
  'A proposal is not permission.': 'الاقتراح ليس إذناً بالتنفيذ.',
  'A language model interprets a snapshot and suggests care. Deterministic validation stays between its output and any actuator interface.': 'يفسر النموذج اللغوي لقطة من البيانات ويقترح العناية. ويظل التحقق الحتمي فاصلاً بين مخرجاته وأي واجهة للمشغلات.',
  'Sense': 'استشعار',
  'Derive': 'اشتقاق',
  'Propose': 'اقتراح',
  'Review': 'مراجعة',
  'Air, humidity, medium moisture, CO₂, LED temperature and reservoir level.': 'الهواء والرطوبة ورطوبة الوسط وCO₂ وحرارة LED ومستوى الخزان.',
  'Estimate vapor-pressure deficit from temperature and relative humidity.': 'تقدير عجز ضغط البخار من درجة الحرارة والرطوبة النسبية.',
  'Recorded model output suggests irrigation, light, fan duty and rationale.': 'تقترح مخرجات النموذج المسجلة الري والإضاءة وتشغيل المروحة ومبررات ذلك.',
  'Plain rules cap or block selected outputs. Each adjustment stays visible.': 'تضع القواعد الواضحة حداً لبعض المخرجات أو تمنعها. ويظل كل تعديل ظاهراً.',
  '04 / Crop profiles': '٠٤ / ملفات المحاصيل',
  'Two plants. Two different needs.': 'نباتان، واحتياجان مختلفان.',
  'Targets below are notebook profile values, not universal growing advice. A real mission system needs validation by cultivar, medium and growth phase.': 'الأهداف أدناه قيم لملفات الدفتر وليست نصائح زراعية عامة. يحتاج نظام المهمة الفعلي إلى تحقق بحسب الصنف والوسط ومرحلة النمو.',
  'PROFILE / 0': 'الملف / ٠',
  '05 / Real build & model': '٠٥ / التصميم الفعلي والنموذج',
  'A place for the real geometry.': 'مكان للهندسة الفعلية.',
  'No CAD model is supplied here. The cutaway is an illustrative system diagram, not a fabricated prototype.': 'لا يتوفر هنا نموذج CAD. المقطع رسم توضيحي للنظام، وليس نموذجاً أولياً مصنوعاً.',
  'ILLUSTRATIVE SYSTEM CUTAWAY': 'مقطع توضيحي للنظام',
  'LOCAL CAD PREVIEW': 'معاينة CAD محلية',
  'Concept connections, not a build claim.': 'تصور للترابط، لا ادعاء بوجود بناء.',
  'Choose a self-contained .glb or .gltf file to inspect it locally. The file remains in this browser; nothing is uploaded.': 'اختر ملف ‎.glb أو ‎.gltf مكتفياً ذاتياً لمعاينته محلياً. يبقى الملف في هذا المتصفح ولا يُرفع.',
  'A .gltf file must embed its resources. A self-contained .glb is recommended.': 'يجب أن يضم ملف ‎.gltf موارده. نوصي بملف ‎.glb مكتفٍ ذاتياً.',
  '06 / Boundaries': '٠٦ / حدود السلامة',
  'Clear rules. Clear limits.': 'قواعد واضحة. وحدود واضحة.',
  'The displayed rules address three explicit conditions: a thermal cap, a low-reservoir interlock and a per-event irrigation limit.': 'تعالج القواعد المعروضة ثلاث حالات محددة: حدّاً حرارياً، وقفل انخفاض مستوى الخزان، وحداً لكمية الري في كل مرة.',
  'LED thermal cap': 'حد حرارة LED',
  'At 60°C or above, proposed light intensity is capped at 15%.': 'عند ٦٠°م أو أكثر، تُحدد شدة الضوء المقترحة بحد أقصى ١٥٪.',
  'Low reservoir interlock': 'قفل انخفاض مستوى الخزان',
  'Below 5% reservoir level, irrigation is forced to zero.': 'إذا انخفض مستوى الخزان عن ٥٪، تصبح كمية الري صفراً.',
  'Per-event irrigation limit': 'حد الري لكل مرة',
  'A proposed irrigation event above 150 ml is capped at 150 ml.': 'إذا تجاوزت كمية الري المقترحة ١٥٠ مل، تُحدد عند ١٥٠ مل.',
  'What the replay can—and cannot—say': 'ما الذي توضحه الإعادة وما لا توضحه',
  'The page replays eight synthetic notebook frames. Only potato has a recorded run; tomato shows its configured profile without borrowed readings. No live sensors, model calls, approval flow or actuator commands are connected.': 'تعيد الصفحة تشغيل ثمانية إطارات اصطناعية من الدفتر. للبطاطس قراءة مسجلة فقط؛ أما الطماطم فتُعرض بملفها المُعد دون استعارة قراءات. لا توجد حساسات حية أو اتصالات بالنموذج أو موافقات أو أوامر للمشغلات.',
  'Tend the loop.': 'اعتنِ بالدورة.',
  'See the crop, the recorded frame and the rule outcome—without mistaking replay for live control.': 'شاهد المحصول والإطار المسجل ونتيجة القاعدة، دون الخلط بين الإعادة والتحكم المباشر.',
  'Open the offline dashboard': 'افتح لوحة البيانات المحلية',
  'OFFLINE REPLAY · NO LIVE CONTROL': 'إعادة محلية · لا يوجد تحكم حي',
  'Site preferences': 'تفضيلات الموقع',
  'Healthy leafy greens growing in a compact controlled cultivation module': 'خضراوات ورقية صحية تنمو في وحدة زراعة مضبوطة ومدمجة',
  'Hydroponic root zone with visible roots and a measured irrigation line': 'منطقة جذور مائية تظهر فيها الجذور وخط ري مضبوط',
  'Dwarf tomato plant bearing fruit in a controlled hydroponic chamber': 'نبات طماطم قزم يحمل ثماراً داخل حجرة زراعة مائية مضبوطة',
  'Dwarf tomato plant in a controlled hydroponic growth chamber': 'نبات طماطم قزم في حجرة نمو مائية مضبوطة',
  'Potato plant growing in a terracotta-colored substrate pot': 'نبات بطاطس ينمو في أصيص بوسط زراعي بلون الطين',
  'Dwarf tomato plant with ripe fruit': 'نبات طماطم قزمية يحمل ثماراً ناضجة',
  'ROOT ZONE / CONCEPT VISUAL': 'منطقة الجذور / تصور مفاهيمي',
};
const arTranslations = { ...arText, ...arMore, ...arAdditional, ...arJournal };
const toArabic = (value: string) => {
  if (arTranslations[value]) return arTranslations[value];
  const outside = value.match(/^(\d+) signals outside range$/);
  if (outside) return `${outside[1]} إشارات خارج النطاق`;
  const frameLabel = value.match(/^FRAME (\d{2}) \/ 08$/);
  if (frameLabel) return `الإطار ${frameLabel[1]} / ٠٨`;
  const frameStatus = value.match(/^Frame (\d{2})$/);
  if (frameStatus) return `الإطار ${frameStatus[1]}`;
  const unpaddedFrame = value.match(/^Frame (\d+)$/);
  if (unpaddedFrame) return `الإطار ${unpaddedFrame[1]}`;
  const frameTime = value.match(/^Frame (\d+) · (\d{2}:\d{2})$/);
  if (frameTime) return `الإطار ${frameTime[1]} · ${frameTime[2]}`;
  const sampleCount = value.match(/^(\d+) rule adjustments? in this frame$/);
  if (sampleCount) return `${sampleCount[1]} تعديلات على القواعد في هذا الإطار`;
  const timeline = value.match(/^(\d{2}:\d{2}) · frame (\d+) of 8$/);
  if (timeline) return `${timeline[1]} · الإطار ${timeline[2]} من ٨`;
  const ledLimit = value.match(/^LED ([\d.]+)°C ≥ 60°C: light capped ([\d.]+)% → ([\d.]+)%$/);
  if (ledLimit) return `حرارة LED ‏${ledLimit[1]}°م ≥ ٦٠°م: حُدد الضوء من ${ledLimit[2]}٪ إلى ${ledLimit[3]}٪`;
  const reservoirLimit = value.match(/^Reservoir ([\d.]+)% < 5%: irrigation forced ([\d.]+) ml → 0 ml$/);
  if (reservoirLimit) return `الخزان ${reservoirLimit[1]}٪ < ٥٪: خُفض الري من ${reservoirLimit[2]} مل إلى صفر`;
  const irrigationLimit = value.match(/^Irrigation request capped at 150 ml$/);
  if (irrigationLimit) return 'حُدد طلب الري عند ١٥٠ مل';
  const chartLabel = value.match(/^(.+) across eight synthetic telemetry frames\. Target ([\d.]+) to ([\d.]+) (.+)\.$/);
  if (chartLabel) return `${arTranslations[chartLabel[1]] ?? chartLabel[1]} عبر ثمانية إطارات قياس اصطناعية. النطاق المستهدف ${chartLabel[2]} إلى ${chartLabel[3]} ${chartLabel[4]}.`;
  const pointTitle = value.match(/^(\d{2}:\d{2}) · ([\d.]+) (.+)$/);
  if (pointTitle) return `${pointTitle[1]} · ${pointTitle[2]} ${pointTitle[3]}`;
  return value;
};

type LocalizedProps = {
  children?: ReactNode;
  'aria-label'?: string;
  title?: string;
  alt?: string;
  placeholder?: string;
};

function translateReactNode(node: ReactNode, language: 'en' | 'ar'): ReactNode {
  if (language === 'en' || node == null) return node;
  return Children.map(node, (child) => {
    if (typeof child === 'string') {
      const leading = child.match(/^\s*/)?.[0] ?? '';
      const trailing = child.match(/\s*$/)?.[0] ?? '';
      const text = child.trim();
      return text ? `${leading}${toArabic(text)}${trailing}` : child;
    }
    if (!isValidElement<LocalizedProps>(child)) return child;

    const translatedProps: Partial<LocalizedProps> = {};
    (['aria-label', 'title', 'alt', 'placeholder'] as const).forEach((attribute) => {
      const value = child.props[attribute];
      if (value) translatedProps[attribute] = toArabic(value);
    });
    return cloneElement(child, {
      ...translatedProps,
      children: translateReactNode(child.props.children, language),
    });
  });
}

function LocalizedTree({ language, children }: { language: 'en' | 'ar'; children: ReactNode }) {
  return <>{translateReactNode(children, language)}</>;
}

function useSitePreferences() {
  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested === 'ar' || requested === 'en') return requested;
    return localStorage.getItem('oasis-language') === 'ar' ? 'ar' : 'en';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const requested = new URLSearchParams(window.location.search).get('theme');
    if (requested === 'dark' || requested === 'light') return requested;
    return localStorage.getItem('oasis-theme') === 'dark' ? 'dark' : 'light';
  });
  useEffect(() => {
    localStorage.setItem('oasis-language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  useEffect(() => {
    localStorage.setItem('oasis-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  return { language, setLanguage, theme, setTheme };
}

function TelemetryChart({ metric, crop, activeFrame, language }: { metric: MetricKey; crop: CropKey; activeFrame: number; language: 'en' | 'ar' }) {
  const chartValues = useMemo(() => frames.map((f) =>
    metric === 'moisture' ? f.moisture : metric === 'air' ? f.air : vpdFor(f.air, f.rh),
  ), [metric]);
  const config = metric === 'moisture'
    ? { min: 0, max: 60, target: cropData[crop].moisture, color: '#2a8c8c', unit: '%', title: 'Substrate moisture' }
    : metric === 'air'
      ? { min: 10, max: 32, target: cropData[crop].air, color: '#d9822b', unit: '°C', title: 'Air temperature' }
      : { min: 0, max: 2.2, target: cropData[crop].vpd, color: '#7b5ea7', unit: 'kPa', title: 'Derived VPD' };
  const W = 600, H = 225, padL = 36, padR = 12, padT = 12, padB = 28;
  const x = (i: number) => padL + (i * (W - padL - padR)) / 7;
  const y = (v: number) => padT + ((config.max - v) / (config.max - config.min)) * (H - padT - padB);
  const path = chartValues.map((value, i) => `${i ? 'L' : 'M'}${x(i)},${y(value)}`).join(' ');
  const bandTop = y(config.target[1]), bandBottom = y(config.target[0]);
  const formatValue = (value: number) => `${value.toFixed(metric === 'vpd' ? 2 : 1)} ${config.unit}`;
  const gridValues = metric === 'moisture' ? [0, 20, 40, 60] : metric === 'air' ? [10, 20, 30] : [0, 0.5, 1, 1.5, 2];
  return (
    <LocalizedTree language={language}>
    <>
      <div className="card-top">
         <div><h4>{config.title} · {config.unit}</h4><p>Target window shaded · 15 min sample cadence</p></div>
        <div className="legend"><span><i style={{ background: config.color }} />Recorded value</span><span><i className="target-i" />Profile range</span><span><i className="cyan-i" />Selected frame</span></div>
      </div>
      <div className="chart-area">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${config.title} across eight synthetic telemetry frames. Target ${config.target[0]} to ${config.target[1]} ${config.unit}.`}>
            <rect x={padL} y={bandTop} width={W - padL - padR} height={Math.max(2, bandBottom - bandTop)} className="target-band" style={{ fill: `${config.color}22` }} />
          {gridValues.map((value) => (
            <g key={value}>
              <line x1={padL} x2={W - padR} y1={y(value)} y2={y(value)} className="chart-gridline" />
              <text x={padL - 7} y={y(value) + 3} textAnchor="end" className="axis-label">{value}</text>
            </g>
          ))}
          {frames.map((_, i) => (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={H - padB + 2} y2={H - padB + 5} className="chart-gridline" />
              <text x={x(i)} y={H - 8} textAnchor="middle" className="axis-label">{formatTime(i)}</text>
            </g>
          ))}
          <path d={path} className="chart-line" stroke={config.color} />
          {chartValues.map((value, i) => (
            <circle key={i} cx={x(i)} cy={y(value)} r={i === activeFrame ? 5 : 3} fill={i === activeFrame ? '#1f3a28' : config.color} className="chart-point">
              <title>{formatTime(i)} · {formatValue(value)}</title>
            </circle>
          ))}
        </svg>
      </div>
    </>
    </LocalizedTree>
  );
}

function AppPage() {
  const { language, setLanguage, theme, setTheme } = useSitePreferences();
  const [location] = useLocation();
  const isDashboard = location === '/dashboard';
  const [crop, setCrop] = useState<CropKey>('potato');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('moisture');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelError, setModelError] = useState('');
  const sample = frames[frame];
  const vpd = vpdFor(sample.air, sample.rh);
  const hasReplayData = crop === 'potato';
  const activeProfile = cropData[crop];
  const profileChecks = [
    { label: 'Air temperature', value: `${sample.air.toFixed(1)} °C`, range: `${activeProfile.air[0]}–${activeProfile.air[1]} °C`, outside: sample.air < activeProfile.air[0] || sample.air > activeProfile.air[1] },
    { label: 'Substrate moisture', value: `${sample.moisture.toFixed(1)}%`, range: `${activeProfile.moisture[0]}–${activeProfile.moisture[1]}%`, outside: sample.moisture < activeProfile.moisture[0] || sample.moisture > activeProfile.moisture[1] },
    { label: 'Derived VPD', value: `${vpd.toFixed(2)} kPa`, range: `${activeProfile.vpd[0].toFixed(1)}–${activeProfile.vpd[1].toFixed(1)} kPa`, outside: vpd < activeProfile.vpd[0] || vpd > activeProfile.vpd[1] },
  ];
  const outsideProfileCount = profileChecks.filter((check) => check.outside).length;
  const proposedIrrigation = irrigateProposal[frame];
  const proposedLight = lightProposal[frame];
  const permittedIrrigation = sample.reservoir < 5 ? 0 : Math.min(proposedIrrigation, 150);
  const permittedLight = sample.led >= 60 ? Math.min(proposedLight, 15) : proposedLight;
  const interventions = [
    ...(sample.led >= 60 ? [`LED ${sample.led}°C ≥ 60°C: light capped ${proposedLight}% → ${permittedLight}%`] : []),
    ...(sample.reservoir < 5 ? [`Reservoir ${sample.reservoir}% < 5%: irrigation forced ${proposedIrrigation} ml → 0 ml`] : []),
    ...(sample.reservoir >= 5 && proposedIrrigation > 150 ? ['Irrigation request capped at 150 ml'] : []),
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % frames.length);
    }, 1150);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!hasReplayData) setPlaying(false);
  }, [hasReplayData]);

  const handleModelFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setModelError('Choose a .glb or .gltf model file.');
      return;
    }
    if (file.size > 75 * 1024 * 1024) {
      setModelError('This local preview supports model files up to 75 MB.');
      return;
    }
    setModelError('');
    setModelFile(file);
  };
  return (
    <div className={`oasis-app ${isDashboard ? 'dashboard-site' : 'field-journal'}`}>
      <LocalizedTree language={language}>
      <header className={`site-header ${!isDashboard ? 'journal-header' : ''}`}>
        <div className="shell nav-inner">
          <Link className="brand" href="/" aria-label="O.A.S.I.S. — Orbital Adaptive Smart Irrigation and Sustenance home">
            <img className="brand-emblem" src="/images/oasis-logo-mark.png" alt="" />
            <span className="brand-copy">
              <span className="brand-word">O.A.S.I.S.</span>
              <span className="brand-sub">ORBITAL ADAPTIVE SMART<br />IRRIGATION &amp; SUSTENANCE</span>
            </span>
          </Link>
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main navigation" id="main-navigation">
            <a href="/#mission" onClick={() => setMenuOpen(false)}>Mission</a>
            <a href={isDashboard ? '/#architecture' : '/#crops'} onClick={() => setMenuOpen(false)}>{isDashboard ? 'Architecture' : 'Crop profiles'}</a>
            <Link href="/dashboard" className={isDashboard ? 'nav-active' : ''} aria-current={isDashboard ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <a href={isDashboard ? '/#model' : '/#architecture'} onClick={() => setMenuOpen(false)}>{isDashboard ? 'Prototype' : 'Decision chain'}</a>
            <a href="/#model" onClick={() => setMenuOpen(false)}>3D model</a>
            <a href="/#safeguards" onClick={() => setMenuOpen(false)}>Safeguards</a>
            <a href={isDashboard ? '/#project' : '/#credits'} onClick={() => setMenuOpen(false)}>{isDashboard ? 'Project' : 'Credits'}</a>
          </nav>
          <div className="site-controls" aria-label="Site preferences">
            <button type="button" className="preference-button" data-testid="button-language" aria-label={language === 'en' ? 'Switch language to Arabic' : 'Switch language to English'} onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>{language === 'en' ? 'عربي' : 'English'}</button>
            <button type="button" className="preference-button theme-button" data-testid="button-theme" aria-pressed={theme === 'dark'} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}<span>{theme === 'light' ? 'Dark' : 'Light'}</span></button>
          </div>
          <button className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </header>

      <main>
        {!isDashboard && <>
        <section id="top" className="hero">
          <div className="hero-art" aria-hidden="true"><img src="/images/oasis-canopy-hero.jpg" alt="" /></div>
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-copy">
            <div className="hero-mark"><img src="/images/oasis-logo-mark.png" alt="" /><span>O.A.S.I.S. <i>·</i> orbital cultivation</span></div>
            <div className="eyebrow">Plant-first habitat concept</div>
            <h1 className="hero-title"><span>Food,</span><span>beyond Earth.</span></h1>
            <p>A cultivation concept exploring how food, water, atmosphere and power can work together in a closed habitat.</p>
            <div className="hero-actions">
              <a className="action hero-outline" href="#mission">Explore the concept <ArrowDown size={15} /></a>
              <Link className="action hero-quiet" href="/dashboard">Replay the data <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="hero-caption"><span>FIELD NOTES / 01</span><span>Root zone · air · light · water</span></div>
        </section>

        <section id="mission" className="journal-section mission-section">
          <div className="section-shell">
            <div className="mission-intro">
              <div className="mission-heading">
                <div className="eyebrow">01 / The growing question</div>
                <h2 className="display">Fresh food is part of the habitat.</h2>
              </div>
              <div className="mission-intro-copy">
                <p>For a long-duration crew, crops bring nutrition, variety and the everyday rhythm of tending living things. A spacecraft habitat, meanwhile, has little spare water or power and an atmosphere where each variable affects the next.</p>
                <a href="#constraints" className="text-link">Four constraints, one living system <ArrowRight size={15} /></a>
              </div>
            </div>
            <div className="mission-feature">
              <figure className="mission-photo">
                <img src="/images/oasis-habitat-canopy.jpg" alt="Healthy leafy greens growing in a compact controlled cultivation module" />
                <figcaption>Plant-only cultivation module · concept visual</figcaption>
              </figure>
              <div className="mission-note">
                <span className="note-index">FIELD NOTE 01</span>
                <h3>Grow with the limits in view.</h3>
                <p>O.A.S.I.S. links plant-relevant sensing to care recommendations. The model may propose; a small, inspectable rules layer decides what may proceed.</p>
                <blockquote>A useful model knows when it is not in charge.</blockquote>
              </div>
            </div>
          </div>
        </section>

        <section id="constraints" className="journal-section constraints-section">
          <div className="section-shell">
            <div className="section-heading-row">
              <div><div className="eyebrow">02 / Habitat constraints</div><h2 className="display">Every resource touches the roots.</h2></div>
              <p>Growing well means balancing the whole environment, not optimizing one reading in isolation.</p>
            </div>
            <div className="constraint-mosaic">
              <article className="constraint-card constraint-water">
                <img src="/images/oasis-root-zone.jpg" alt="Hydroponic root zone with visible roots and a measured irrigation line" />
                <small className="image-credit">ROOT ZONE / CONCEPT VISUAL</small>
                <div className="constraint-card-copy"><span>01 / WATER</span><h3>Deliver carefully.</h3><p>Too little water stresses a crop. Too much can saturate its medium and leave roots short of oxygen.</p></div>
              </article>
              <article className="constraint-card constraint-air">
                <img src="/images/oasis-tomato-canopy.jpg" alt="Dwarf tomato plant in a controlled hydroponic growth chamber" />
                <div className="constraint-card-copy"><span>02 / ATMOSPHERE</span><h3>Read the canopy.</h3><p>Humidity, temperature and CO₂ interact with transpiration and photosynthesis. One threshold cannot tell the whole story.</p></div>
              </article>
              <article className="constraint-card constraint-power">
                <img src="/images/potato-plant-cutout.png" alt="Potato plant and its growing medium" />
                <div className="constraint-card-copy"><span>03 / POWER &amp; HEAT</span><h3>Stay within limits.</h3><p>Lighting and fans help plants, but draw power and produce heat. Selected outputs are bounded by explicit rules.</p></div>
              </article>
              <article className="constraint-card constraint-food">
                <img src="/images/tomato-plant-cutout.png" alt="Dwarf tomato plant with ripe fruit" />
                <div className="constraint-card-copy"><span>04 / FOOD</span><h3>Protect the harvest.</h3><p>Crop condition shapes food variety and crew routine. O.A.S.I.S. aims for clearer visibility, not a promise of autonomy.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section id="architecture" className="journal-section decision-section">
          <div className="section-shell">
            <div className="section-heading-row">
              <div><div className="eyebrow">03 / Decision chain</div><h2 className="display">A proposal is not permission.</h2></div>
              <p>A language model interprets a snapshot and suggests care. Deterministic validation stays between its output and any actuator interface.</p>
            </div>
            <div className="decision-line">
              <article><span>01</span><Radio size={20} /><h3>Sense</h3><p>Air, humidity, medium moisture, CO₂, LED temperature and reservoir level.</p></article>
              <article><span>02</span><Gauge size={20} /><h3>Derive</h3><p>Estimate vapor-pressure deficit from temperature and relative humidity.</p></article>
              <article><span>03</span><Lightbulb size={20} /><h3>Propose</h3><p>Recorded model output suggests irrigation, light, fan duty and rationale.</p></article>
              <article><span>04</span><ShieldCheck size={20} /><h3>Review</h3><p>Plain rules cap or block selected outputs. Each adjustment stays visible.</p></article>
            </div>
          </div>
        </section>
        </>}
        {isDashboard && <section id="dashboard" className="dashboard-page">
          <div className="shell dash-shell">
            <header className="dashboard-toolbar">
              <div className="dashboard-heading">
                <div className="eyebrow">O.A.S.I.S. / Crop observation</div>
                <h1>Life, in the loop.</h1>
                <p>Plant health is habitat health.</p>
              </div>
              <div className="dashboard-actions">
                <div className="plant-switcher" role="group" aria-label="Select plant">
                  {(['potato', 'tomato'] as CropKey[]).map((key) => (
                    <button type="button" key={key} aria-pressed={crop === key} className={crop === key ? 'plant-tab active' : 'plant-tab'} onClick={() => setCrop(key)}>
                      {cropData[key].name}<span>{cropData[key].stage}</span>
                    </button>
                  ))}
                </div>
                <button className="replay-button" type="button" disabled={!hasReplayData} onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause replay' : 'Play replay'}>
                  {playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause replay' : 'Play replay'}
                </button>
              </div>
            </header>

            <section className={`botanical-stage ${hasReplayData && outsideProfileCount > 0 ? 'has-excursion' : ''}`} aria-live="polite">
              <div className="botanical-copy">
                <div className="plant-kicker">{activeProfile.medium} <span>·</span> {activeProfile.stage}</div>
                <h2>{activeProfile.name}</h2>
                <p className="plant-latin">{activeProfile.latin}</p>
                <div className={`range-status ${!hasReplayData ? 'unavailable' : outsideProfileCount > 0 ? 'outside' : 'within'}`}>
                  <i aria-hidden="true" />{!hasReplayData ? 'Profile configured' : outsideProfileCount > 0 ? `${outsideProfileCount} signals outside range` : 'Signals within profile'}
                </div>
                <p className="range-explainer">{hasReplayData ? 'Three measured or derived signals compared with this crop profile.' : 'Targets are configured; no tomato sensor run is available.'}</p>
                <div className="botanical-meta">
                  <span className="data-mode">{hasReplayData ? 'OFFLINE NOTEBOOK' : 'PROFILE ONLY · NO RUN'}</span>
                  <span className="frame-readout">{hasReplayData ? <>FRAME {String(frame + 1).padStart(2, '0')} / 08 <b>{formatTime(frame)}</b></> : 'NO REPLAY FRAME'}</span>
                </div>
                <div className="stage-note"><span className="stage-note-rule" />Fresh food is part of life support.</div>
              </div>

              <figure className={`plant-portrait crop-${crop}`}>
                <div className="portrait-halo" aria-hidden="true" />
                <img src={crop === 'potato' ? '/images/potato-plant-cutout.png' : '/images/tomato-plant-cutout.png'} alt={crop === 'potato' ? 'Potato plant growing in a terracotta-colored substrate pot' : 'Dwarf tomato plant bearing ripe fruit in a hydroponic habitat vessel'} />
                <figcaption><span>01 / 02</span><span>{crop === 'potato' ? 'TUBER CROP' : 'FRUITING CROP'}</span></figcaption>
              </figure>

              <section className="primary-readings" aria-labelledby="primary-readings-title">
                <div className="dash-section-heading">
                  <div><span className="section-index">01</span><h3 id="primary-readings-title">Plant signals</h3></div>
                  <span className="signal-context">{hasReplayData ? `Frame ${frame + 1}` : 'Profile targets'}</span>
                </div>
                <div className="signal-list">
                  {[
                    { key: 'temperature', min: 10, max: 32, raw: sample.air, label: 'Air temperature', value: hasReplayData ? sample.air.toFixed(1) : '—', unit: '°C', target: `${activeProfile.air[0]}–${activeProfile.air[1]} °C`, rng: activeProfile.air, outside: hasReplayData && profileChecks[0].outside, cue: !hasReplayData ? 'No reading recorded' : profileChecks[0].outside ? sample.air < activeProfile.air[0] ? 'Below profile' : 'Above profile' : 'Within profile' },
                    { key: 'moisture', min: 0, max: 60, raw: sample.moisture, label: 'Substrate moisture', value: hasReplayData ? sample.moisture.toFixed(1) : '—', unit: '%', target: `${activeProfile.moisture[0]}–${activeProfile.moisture[1]}%`, rng: activeProfile.moisture, outside: hasReplayData && profileChecks[1].outside, cue: !hasReplayData ? 'No reading recorded' : profileChecks[1].outside ? sample.moisture < activeProfile.moisture[0] ? 'Below profile' : 'Above profile' : 'Within profile' },
                    { key: 'vpd', min: 0, max: 2.2, raw: vpd, label: 'Derived VPD', value: hasReplayData ? vpd.toFixed(2) : '—', unit: 'kPa', target: `${activeProfile.vpd[0].toFixed(1)}–${activeProfile.vpd[1].toFixed(1)} kPa`, rng: activeProfile.vpd, outside: hasReplayData && profileChecks[2].outside, cue: !hasReplayData ? 'No reading recorded' : profileChecks[2].outside ? vpd < activeProfile.vpd[0] ? 'Below profile' : 'Above profile' : 'Within profile' },
                  ].map((signal) => (
                    <article className={`signal-card signal-${signal.key}`} key={signal.key}>
                      <div className="signal-card-head"><span>{signal.label}</span><i aria-hidden="true" /></div>
                      <div className="signal-value">{signal.value}<small>{signal.unit}</small></div>
                      <div className="gauge" aria-hidden="true"><span className="gauge-band" style={{ left: `${(signal.rng[0] - signal.min) / (signal.max - signal.min) * 100}%`, width: `${(signal.rng[1] - signal.rng[0]) / (signal.max - signal.min) * 100}%` }} />{hasReplayData && <span className="gauge-dot" style={{ left: `${Math.min(100, Math.max(0, (signal.raw - signal.min) / (signal.max - signal.min) * 100))}%` }} />}</div>
                      <div className="signal-target"><span>Profile range</span><b>{signal.target}</b></div>
                      <div className={`signal-state ${signal.outside ? 'outside' : ''}`}>{signal.cue}</div>
                    </article>
                  ))}
                </div>
              </section>
            </section>

            <details className="secondary-readings">
              <summary><span>Atmosphere &amp; system readings</span><span className="details-meta">{hasReplayData ? '4 recorded channels' : 'No tomato telemetry recorded'}</span></summary>
              <div className="secondary-grid">
                {[
                  { key: 'humidity', label: 'Relative humidity', value: hasReplayData ? `${sample.rh}%` : 'Not recorded' },
                  { key: 'co2', label: 'CO₂ concentration', value: hasReplayData ? `${sample.co2} ppm` : 'Not recorded' },
                  { key: 'led', label: 'LED temperature', value: hasReplayData ? `${sample.led} °C` : 'Not recorded' },
                  { key: 'reservoir', label: 'Reservoir level', value: hasReplayData ? `${sample.reservoir}%` : 'Not recorded' },
                ].map((reading) => <div className={`secondary-reading secondary-${reading.key}`} key={reading.key}>
                  <span className="secondary-marker" /><span>{reading.label}</span><b>{reading.value}</b>
                </div>)}
              </div>
            </details>

            <section className="proposal-panel" aria-labelledby="proposal-title">
              <div className="insight-heading">
                <div><span className="section-index">02</span><h3 id="proposal-title">Model-to-control pipeline</h3></div>
                <span className="proposal-source">{hasReplayData ? 'Potato · offline notebook replay' : 'Dwarf tomato · profile only'}</span>
              </div>
              <p className="proposal-intro">{hasReplayData ? 'Stored notebook output for this frame; no live LLM call.' : 'No recorded sensor run or model output exists for this crop.'}</p>
              <div className={`pipeline-track ${hasReplayData ? 'has-run' : 'no-run'}`} aria-label="Readings to hardware pipeline">
                {[
                  { label: 'Sensor snapshot', status: hasReplayData ? `Frame ${String(frame + 1).padStart(2, '0')}` : 'No run recorded' },
                  { label: 'LLM proposal', status: hasReplayData ? 'Stored output' : 'Unavailable' },
                  { label: 'Rule review', status: hasReplayData ? 'Results below' : 'Not run' },
                  { label: 'Human approval', status: 'Not connected' },
                  { label: 'Hardware', status: 'Not sent' },
                ].map((step, index) => (
                  <div className="pipeline-step" key={step.label}>
                    <span className="pipeline-step-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="pipeline-step-label">{step.label}</span>
                    <b>{step.status}</b>
                  </div>
                ))}
              </div>
              <table className="proposal-table">
                <thead><tr><th scope="col">Control</th><th scope="col">Recorded proposal</th><th scope="col">Deterministic rule result</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Irrigation volume</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${proposedIrrigation} ml` : 'Not recorded'}</td><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${permittedIrrigation} ml` : 'Not run'}</td></tr>
                  <tr><th scope="row">Light intensity</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${proposedLight}%` : 'Not recorded'}</td><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${permittedLight}%` : 'Not run'}</td></tr>
                  <tr><th scope="row">Red : blue ratio</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `~${redBlueProposal[frame]} : 1` : 'Not recorded'}</td><td className="not-rule-checked">{hasReplayData ? 'Not checked' : 'Not run'}</td></tr>
                  <tr><th scope="row">Fan duty</th><td className={!hasReplayData ? 'not-rule-checked' : undefined}>{hasReplayData ? `${fanProposal[frame]}%` : 'Not recorded'}</td><td className="not-rule-checked">{hasReplayData ? 'Not checked' : 'Not run'}</td></tr>
                </tbody>
              </table>
              <div className="proposal-key"><span><i className="key-recorded" />Recorded proposal</span><span><i className="key-checked" />Rule-checked result</span><span><i className="key-unchecked" />No rule applied</span></div>
            </section>

            <section className="history-section" aria-labelledby="history-title">
              <div className="history-heading">
                <div><span className="section-index">03</span><h3 id="history-title">Signal history</h3><p>{hasReplayData ? 'Potato notebook replay · 12 Oct 2026 · 15-minute samples' : 'Dwarf tomato profile · no telemetry run recorded'}</p></div>
                <label className="metric-picker"><span>Signal</span><select id="metric-select" className="select-control" disabled={!hasReplayData} value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
                  <option value="moisture">Substrate moisture</option><option value="air">Air temperature</option><option value="vpd">Derived VPD</option>
                </select></label>
              </div>
              <div className="history-plot">
                {hasReplayData ? <TelemetryChart metric={metric} crop={crop} activeFrame={frame} language={language} /> : <div className="chart-unavailable">No dwarf tomato sensor run or history is available.</div>}
              </div>
              <div className={`history-timeline ${!hasReplayData ? 'timeline-unavailable' : ''}`}>
                <div className="timeline-label"><label htmlFor="frame-range">Replay position</label><span>{hasReplayData ? `${formatTime(frame)} · frame ${frame + 1} of ${frames.length}` : 'No samples recorded'}</span></div>
                <input id="frame-range" aria-label="Choose replay frame" type="range" min="0" max={hasReplayData ? frames.length - 1 : 0} step="1" value={hasReplayData ? frame : 0} disabled={!hasReplayData} onChange={(event) => setFrame(Number(event.target.value))} />
                <div className="frame-times">{hasReplayData && frames.map((_, index) => <span key={index}>{formatTime(index)}</span>)}</div>
              </div>
            </section>

            <details className="technical-details">
              <summary><span>Technical details</span><span className="details-meta">{hasReplayData ? `${interventions.length} rule adjustment${interventions.length === 1 ? '' : 's'} in this frame` : 'No run-specific rule results'}</span></summary>
              {hasReplayData ? <div className="technical-content">
                <div className="rule-reference">
                  <h4>Deterministic checks in replay</h4>
                  <p><b>LED thermal cap</b><span>At ≥60°C, cap proposed light intensity at 15%.</span></p>
                  <p><b>Low reservoir interlock</b><span>Below 5%, set irrigation volume to zero.</span></p>
                  <p><b>Per-event irrigation cap</b><span>Limit an irrigation event to 150 ml.</span></p>
                  <p className="vpd-formula">VPD = 0.61078 × exp(17.27 × T / (T + 237.3)) × (1 − RH/100).</p>
                </div>
                <div className="rule-events" aria-live="polite">
                  <h4>Frame {frame + 1} · {formatTime(frame)}</h4>
                  {interventions.length ? interventions.map((text) => <p className="rule-event adjusted" key={text}><AlertTriangle size={15} />{text}<b>RULE-ADJUSTED</b></p>) : <p className="rule-event"><Check size={15} />No configured rule changed this replay frame.</p>}
                </div>
              </div> : <p className="proposal-empty">Rule outcomes are unavailable without a recorded run for this plant.</p>}
            </details>
          </div>
        </section>}

        {!isDashboard && <>
        <section id="crops" className="journal-section crop-section">
          <div className="section-shell">
            <div className="section-heading-row">
              <div><div className="eyebrow">04 / Crop profiles</div><h2 className="display">Two plants. Two different needs.</h2></div>
              <p>Targets below are notebook profile values, not universal growing advice. A real mission system needs validation by cultivar, medium and growth phase.</p>
            </div>
            <div className="crop-editorial-grid">
              {(['potato', 'tomato'] as CropKey[]).map((key) => {
                const item = cropData[key];
                return (
                  <article className={`crop-profile-card crop-${key}-editorial`} key={key}>
                    <figure className="crop-photo">
                      <img src={key === 'potato' ? '/images/potato-plant-cutout.png' : '/images/tomato-plant-cutout.png'} alt={key === 'potato' ? 'Potato plant growing in a terracotta-colored substrate pot' : 'Dwarf tomato plant bearing fruit in a controlled hydroponic chamber'} />
                      <figcaption><span>{key === 'potato' ? 'TUBER CROP' : 'FRUITING CROP'}</span><span>PROFILE / 0{key === 'potato' ? '1' : '2'}</span></figcaption>
                    </figure>
                    <div className="crop-profile-content">
                      <div className="crop-title-row">
                        <div><h3>{item.name}</h3><span className="crop-latin">{item.latin}</span></div>
                        <span className="crop-plant-mini"><CropPlant crop={key} /></span>
                      </div>
                      <span className="crop-medium">{item.medium}</span>
                      <div className="profile-values">
                        <div><span>VPD WINDOW</span><b>{item.vpd[0].toFixed(1)}–{item.vpd[1].toFixed(1)} kPa</b></div>
                        <div><span>DLI TARGET</span><b>{item.dli} mol m⁻² d⁻¹</b></div>
                        <div><span>AIR TEMPERATURE</span><b>{item.air[0]}–{item.air[1]} °C</b></div>
                        <div><span>SUBSTRATE MOISTURE</span><b>{item.moisture[0]}–{item.moisture[1]}%</b></div>
                      </div>
                      <p className="risk-line"><b>Watch for:</b> {item.risks}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="model" className="journal-section model-journal">
          <div className="section-shell">
            <div className="section-heading-row model-heading">
              <div><div className="eyebrow">05 / Real build &amp; model</div><h2 className="display">A place for the real geometry.</h2></div>
              <p>No CAD model is supplied here. The cutaway is an illustrative system diagram, not a fabricated prototype.</p>
            </div>
            <div className="model-editorial-panel">
              <div className="model-stage">
               {modelFile ? (
                 <>
                   <div className="model-status">LOCAL MODEL PREVIEW</div>
                  <ModelViewer file={modelFile} onError={setModelError} language={language} />
                   <span className="viewer-hint">DRAG TO ORBIT · SCROLL TO ZOOM</span>
                 </>
               ) : (
                 <>
                   <div className="model-status">ILLUSTRATIVE SYSTEM CUTAWAY</div>
                   <svg className="pending-model" viewBox="0 0 500 330" role="img" aria-label="Illustrative outline of a modular cultivation habitat">
                      <g fill="none" stroke="#5b8a52" strokeWidth="2" strokeLinejoin="round">
                        <path d="M123 86 252 36l126 49v163l-126 56-129-54Z" />
                        <path d="m123 86 129 54 126-55M252 140v164" />
                        <path d="M157 101v135l94 40V141m-63-29 64 29m0 0 93-37v133l-94 42" strokeDasharray="5 6" />
                      </g>
                      <g fill="#d4452f"><circle cx="123" cy="86" r="4" /><circle cx="252" cy="36" r="4" /><circle cx="378" cy="85" r="4" /></g>
                    </svg>
                    <span className="slot-caption">Outline slot · no CAD model loaded</span>
                 </>
               )}
              </div>
              <div className="model-copy">
                <div className="eyebrow">LOCAL CAD PREVIEW</div>
                <h3>Concept connections, not a build claim.</h3>
                 <p>Choose a self-contained .glb or .gltf file to inspect it locally. The file remains in this browser; nothing is uploaded.</p>
                 <div className="model-actions">
                    <label className="action file-label" htmlFor="model-upload" role="button" tabIndex={0} onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        document.getElementById('model-upload')?.click();
                      }
                    }}><FileUp size={14} /> Choose local model</label>
                   {modelFile && <button className="action" type="button" onClick={() => { setModelFile(null); setModelError(''); }}>Clear model</button>}
                 </div>
                 <input id="model-upload" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={handleModelFile} aria-describedby="model-file-note" />
                 <div className={`file-name ${modelError ? 'file-error' : ''}`} id="model-file-note" aria-live="polite">{modelError || (modelFile ? modelFile.name : 'No model selected · browser-local file picker only')}</div>
                 <div className="model-disclaimer">A .gltf file must embed its resources. A self-contained .glb is recommended.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="safeguards" className="journal-section accordion-section">
          <div className="section-shell accordion-layout">
            <div className="accordion-intro">
              <div className="eyebrow">06 / Boundaries</div>
              <h2 className="display">Clear rules. Clear limits.</h2>
              <p>The displayed rules address three explicit conditions: a thermal cap, a low-reservoir interlock and a per-event irrigation limit.</p>
            </div>
            <div className="journal-accordions">
              <details className="journal-accordion">
                <summary><span className="accordion-number">01</span><span>LED thermal cap</span><span className="accordion-symbol" aria-hidden="true" /></summary>
                <div className="accordion-body"><p>At 60°C or above, proposed light intensity is capped at 15%.</p><code>T_LED ≥ 60°C</code></div>
              </details>
              <details className="journal-accordion">
                <summary><span className="accordion-number">02</span><span>Low reservoir interlock</span><span className="accordion-symbol" aria-hidden="true" /></summary>
                <div className="accordion-body"><p>Below 5% reservoir level, irrigation is forced to zero.</p><code>LEVEL &lt; 5%</code></div>
              </details>
              <details className="journal-accordion">
                <summary><span className="accordion-number">03</span><span>Per-event irrigation limit</span><span className="accordion-symbol" aria-hidden="true" /></summary>
                <div className="accordion-body"><p>A proposed irrigation event above 150 ml is capped at 150 ml.</p><code>MAX 150 ml</code></div>
              </details>
              <details className="journal-accordion">
                <summary><span className="accordion-number">04</span><span>What the replay can—and cannot—say</span><span className="accordion-symbol" aria-hidden="true" /></summary>
                <div className="accordion-body"><p>The page replays eight synthetic notebook frames. Only potato has a recorded run; tomato shows its configured profile without borrowed readings. No live sensors, model calls, approval flow or actuator commands are connected.</p></div>
              </details>
            </div>
          </div>
        </section>

        <section id="project" className="closing-panel">
          <div className="closing-backdrop" aria-hidden="true" />
          <div className="closing-copy">
            <div className="eyebrow">O.A.S.I.S. / Field notes</div>
            <h2 className="display">Tend the loop.</h2>
            <p>See the crop, the recorded frame and the rule outcome—without mistaking replay for live control.</p>
            <Link href="/dashboard" className="action closing-cta">Open the offline dashboard <ArrowRight size={16} /></Link>
          </div>
          <footer className="journal-footer">
            <div className="journal-footer-brand">
              <img src="/images/oasis-logo-mark.png" alt="" />
              <span><strong>O.A.S.I.S.</strong><small>Orbital Adaptive Smart Irrigation &amp; Sustenance</small></span>
            </div>
            <div className="journal-footer-links">
              <a href="/#mission">Mission</a><a href="/#safeguards">Safeguards</a><a href="/#credits">Credits</a><Link href="/dashboard">Dashboard</Link>
            </div>
            <span className="footer-disclaimer">OFFLINE REPLAY · NO LIVE CONTROL</span>
          </footer>
        </section>
        </>}
      </main>
      {isDashboard && <footer className="footer">
        <div className="shell footer-inner">
          <div><strong>O.A.S.I.S.</strong> · Offline synthetic telemetry replay · No live control</div>
          <div className="footer-links"><Link href="/">Project overview</Link><a href="#dashboard">Back to dashboard top ↑</a></div>
        </div>
      </footer>}
      </LocalizedTree>
    </div>
  );
}

function App() {
  return <Router><AppPage /></Router>;
}

export default App;
