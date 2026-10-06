import {Routes,Route,Link} from 'react-router-dom';
import {Leaf,Menu,X,ArrowRight,ShieldCheck,MessageCircle,Languages,Sparkles,MapPin,Compass,Heart,CheckCircle2,ExternalLink,RotateCcw,Clock,Users,Footprints,Send,Plane,Hotel,FileText,Pencil,Plus,Trash2,Download,Eye,Settings2,Mail,Phone,LockKeyhole,LogIn,LogOut,RefreshCw,Search,UserRound} from 'lucide-react';
import {useEffect,useState} from 'react';
import { jsPDF } from 'jspdf';
import {supabase,supabaseConfigured} from './supabaseClient';

/* V3: edit future contact details here only. Up to 3 WhatsApp/phone + 3 email contacts are supported. */
const CONTACTS=[
 {id:'main',name:'Ceylon Wellness',role:'Journey support',phone:'+48 696 741 450',email:'',active:true,primary:true},
 {id:'contact2',name:'Contact 2',role:'',phone:'',email:'',active:false,primary:false},
 {id:'contact3',name:'Contact 3',role:'',phone:'',email:'',active:false,primary:false}
];
const PRIMARY=CONTACTS.find(c=>c.primary&&c.active)||CONTACTS[0];
const WAN=PRIMARY.phone.replace(/\D/g,'');
const wa=(m:string)=>`https://wa.me/${WAN}?text=${encodeURIComponent(m)}`;
const LANGS=['EN','PL','RU','DE','FR'] as const; type Lang=typeof LANGS[number];
const ADMIN_LANGUAGE_SUGGESTIONS=['EN','PL','RU','DE','FR','Sinhala','Tamil','Hindi','Malayalam','Telugu','Ukrainian','Spanish'];

const safePdfValue=(value:string|number|null|undefined,fallback='—')=>{
  const text=String(value ?? '').trim();
  return text || fallback;
};

const hasValidFinalPricing=(pricing:{currency?:string|null;totalPrice?:string|number|null;advanceAmount?:string|number|null;remainingBalance?:string|number|null})=>{
  const isPositiveAmount=(value:string|number|null|undefined)=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>0;
  return Boolean(pricing.currency?.trim())&&isPositiveAmount(pricing.totalPrice)&&isPositiveAmount(pricing.advanceAmount)&&isPositiveAmount(pricing.remainingBalance);
};

const isDemoPlaceholderValue=(value:string|null|undefined)=>{
  if(value===null||value===undefined) return true;
  const normalized=String(value).trim();
  if(!normalized || normalized==='—' || normalized==='-') return true;
  return /demo|placeholder|test record|not a real traveller|safe for testing|no real supplier booking/i.test(normalized);
};

const isMeaningfulText=(value:string|null|undefined)=>{
  if(value===null||value===undefined) return false;
  const normalized=String(value).replace(/[\u2012\u2013\u2014\u2015\u2016]/g,'').replace(/-/g,'').replace(/\s+/g,' ').trim();
  return normalized.length>0 && normalized !== '—' && normalized !== '-' && !/^\s*[-–—]*\s*$/.test(normalized);
};

const loadTravellerPdfFont=async(doc:jsPDF)=>{
  const fontName='DejaVuSans';
  const fontKey='__cwPdfFontLoaded';
  if((doc as any)[fontKey]) return;
  try {
    const fontFiles=[
      {file:'DejaVuSans.ttf',style:'normal'},
      {file:'DejaVuSans-Bold.ttf',style:'bold'}
    ] as const;
    for (const entry of fontFiles) {
      const response=await fetch(`/fonts/${entry.file}`);
      if(!response.ok) throw new Error('Font fetch failed');
      const buffer=await response.arrayBuffer();
      const bytes=new Uint8Array(buffer);
      let binary='';
      bytes.forEach((byte)=>{binary += String.fromCharCode(byte);});
      const base64=btoa(binary);
      (doc as any).addFileToVFS(entry.file, base64);
      (doc as any).addFont(entry.file, fontName, entry.style);
    }
    (doc as any)[fontKey]=true;
  } catch {
    (doc as any)[fontKey]=true;
  }
};

const downloadTravellerPdf=async(payload:{
  name?:string|null;
  journeyRef?:string|null;
  travelDates?:string|null;
  travellers?:string|number|null;
  preferredLanguage?:string|null;
  preparedBy?:string|null;
  finalNote?:string|null;
  itinerary?:Array<{day?:number|string|null;place?:string|null;focus?:string|null;activity?:string|null;stay?:string|null;notes?:string|null}>;
  arrivalAirport?:string|null;
  flightNumber?:string|null;
  landingTime?:string|null;
  airportPickup?:string|null;
  journeyStyle?:string|null;
  accommodation?:string|null;
  transport?:string|null;
  budgetRange?:string|null;
  requirements?:string|null;
  currency?:string|null;
  totalPrice?:string|number|null;
  advanceDepositType?:string|null;
  advanceDepositValue?:string|number|null;
  advanceAmount?:string|number|null;
  remainingBalance?:string|number|null;
  advanceDueDate?:string|null;
  balanceDueDate?:string|null;
  quotationValidUntil?:string|null;
  bookingStatus?:string|null;
  accommodationStatus?:string|null;
  transportStatus?:string|null;
  wellnessStatus?:string|null;
  accommodationDetails?:string|null;
  transportDetails?:string|null;
  wellnessDetails?:string|null;
  priceIncludes?:string|null;
  priceExcludes?:string|null;
  paymentInstructions?:string|null;
  cancellationTerms?:string|null;
})=>{
  if(typeof window==='undefined')return;
  if(!hasValidFinalPricing(payload)){
    window.alert('Final journey pricing must be completed by the Ceylon Wellness team before a Traveller PDF can be downloaded.');
    return;
  }

  const doc=new jsPDF({unit:'pt',format:'a4'});
  const width=doc.internal.pageSize.getWidth();
  const height=doc.internal.pageSize.getHeight();
  const margin=42;
  const innerWidth=width - margin * 2;
  const pdfFont='DejaVuSans';
  await loadTravellerPdfFont(doc);

  const safeText=(value:string|number|null|undefined,fallback='—')=>String(value ?? '').trim() || fallback;
  const safeLabel=(value:string|null|undefined,fallback='—')=>{
    const text=String(value ?? '').trim();
    if(!text || text==='—' || text==='-' || isDemoPlaceholderValue(text)) return fallback;
    return text;
  };
  const normalizeStatus=(value:string|null|undefined,fallback='Pending confirmation')=>{
    const text=String(value ?? '').trim();
    if(!text || text==='—' || text==='-' || /DRAFT/i.test(text) || isDemoPlaceholderValue(text)) return fallback;
    return text;
  };
  const parseNumber=(value:string|number|null|undefined)=>{
    const numeric=Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const formatCurrency=(value:string|number|null|undefined, currency?:string|null)=>{
    const code=(currency && currency.trim()) ? currency.trim().toUpperCase() : 'EUR';
    const symbolMap:Record<string,string>={EUR:'€',USD:'$',GBP:'£',PLN:'zł',CHF:'CHF',SEK:'kr',NOK:'kr',AUD:'A$',CAD:'C$'};
    const symbol=symbolMap[code] || code;
    const amount=parseNumber(value);
    return `${symbol}${amount.toLocaleString('en-GB',{maximumFractionDigits:0})}`;
  };
  const formatSingleDate=(value:string|null|undefined)=>{
    const text=String(value ?? '').trim();
    if(!text || text==='—' || text==='-') return 'TBC';
    const parsed=new Date(text);
    if(!Number.isNaN(parsed.getTime())){
      return parsed.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    }
    return text;
  };
  const formatDateRange=(value:string|null|undefined)=>{
    const text=String(value ?? '').trim();
    if(!text || text==='—' || text==='-') return 'TBC';
    const parts=text.split(/\s*(?:[-–—]|to)\s*/i).filter(Boolean);
    if(parts.length > 1){
      return `${formatSingleDate(parts[0])} – ${formatSingleDate(parts[1])}`;
    }
    return formatSingleDate(text);
  };
  const cleanList=(value:string|null|undefined)=>{
    if(!value) return '';
    const text=String(value).replace(/\s+/g,' ').trim();
    if(!text || isDemoPlaceholderValue(text) || text==='—' || text==='-') return '';
    return text;
  };
  const sanitizeFilename=(value:string)=>value.replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase() || 'ceylon-wellness-journey';
  const textLines=(text:string,maxWidth:number,limit=999): string[]=>{
    const lines=doc.splitTextToSize(text,maxWidth) as string[];
    return lines.slice(0,limit);
  };
  const normalizeComparableText=(value:string|null|undefined)=>{
    const text=String(value ?? '').toLowerCase().trim();
    return text.replace(/[.,;:!?]+$/g,'').replace(/\s+/g,' ').trim();
  };
  const shouldHideDuplicateActivity=(focus:string|null|undefined, activity:string|null|undefined)=>{
    const focusValue=normalizeComparableText(focus);
    const activityValue=normalizeComparableText(activity);
    if(!focusValue || !activityValue) return false;
    return focusValue === activityValue;
  };
  const drawHeader=(pageIndex:number, journeyRef:string)=>{
    if(pageIndex === 1) return;
    doc.setPage(pageIndex);
    doc.setDrawColor(185,166,120);
    doc.line(margin, 44, width - margin, 44);
    doc.setTextColor(22,61,50);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(8.5);
    doc.text('CEYLON WELLNESS', margin, 28);
    doc.text(journeyRef, width - margin, 28, {align:'right'});
  };
  const drawFooter=(pageIndex:number,totalPages:number)=>{
    if(pageIndex === 1) return;
    doc.setPage(pageIndex);
    doc.setDrawColor(185,166,120);
    doc.line(margin, height - 38, width - margin, height - 38);
    doc.setTextColor(78,82,79);
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(7.5);
    doc.text('Ceylon Wellness', margin, height - 20);
    doc.text(`${pageIndex} / ${totalPages}`, width - margin, height - 20, {align:'right'});
  };
  const safeName=safeText(payload.name,'Traveller');
  const safeRef=safeText(payload.journeyRef,'Journey proposal');
  const safeTravelDates=formatDateRange(payload.travelDates);
  const travellerCount=safeText(payload.travellers,'TBC');
  const safeJourneySummary=safeText(payload.journeyStyle,'TBC');
  const landingTime=safeLabel(payload.landingTime,'TBC');
  const journeySummary=safeText(payload.finalNote, 'Journey details are subject to human confirmation.');
  const accommodation=safeLabel(payload.accommodation,'TBC');
  const transport=safeLabel(payload.transport,'TBC');
  const arrivalAirport=safeLabel(payload.arrivalAirport,'TBC');
  const flightNumber=safeLabel(payload.flightNumber,'—');
  const airportPickup=safeLabel(payload.airportPickup,'TBC');
  const requirements=safeLabel(payload.requirements,'TBC');
  const totalValue=formatCurrency(payload.totalPrice,payload.currency);
  const reserveValue=formatCurrency(payload.advanceAmount,payload.currency);
  const balanceValue=formatCurrency(payload.remainingBalance,payload.currency);
  const quotationText=`Quotation valid until ${formatSingleDate(payload.quotationValidUntil)}`;
  const includedText=cleanList(payload.priceIncludes) || 'No inclusions have been added yet.';
  const excludedText=cleanList(payload.priceExcludes) || 'No exclusions have been added yet.';
  const paymentText=cleanList(payload.paymentInstructions) || 'Please confirm the preferred payment method and timing with Ceylon Wellness before final confirmation.';
  const cancellationText=cleanList(payload.cancellationTerms) || 'Final cancellation and refund conditions will be confirmed before payment is received.';
  const itinerary=(payload.itinerary || []).filter((day)=>isMeaningfulText(day.day as unknown as string) || isMeaningfulText(day.place) || isMeaningfulText(day.focus) || isMeaningfulText(day.activity) || isMeaningfulText(day.stay)).map((day)=>({
    day: safeText(day.day,'Day'),
    place: safeLabel(day.place,'Location TBC'),
    focus: safeLabel(day.focus,'TBC'),
    activity: safeLabel(day.activity,'TBC'),
    stay: safeLabel(day.stay,'Stay TBC'),
    notes: isMeaningfulText(day.notes) ? String(day.notes).trim() : ''
  }));
  const statusAccommodation=normalizeStatus(payload.accommodationStatus,'Pending confirmation');
  const statusTransport=normalizeStatus(payload.transportStatus,'Pending confirmation');
  const statusWellness=normalizeStatus(payload.wellnessStatus,'Pending confirmation');
  const fileSlug=`Ceylon-Wellness-${sanitizeFilename(safeRef)}-${sanitizeFilename(safeName)}`;

  const addPage = ()=> {
    doc.addPage();
    return doc.getCurrentPageInfo().pageNumber;
  };

  doc.setFillColor(245,239,232);
  doc.rect(0, 0, width, height, 'F');

  const pageGridX = 51;
  const pageGridW = width - pageGridX * 2;
  const pageColGap = 22;
  const pageColW = (pageGridW - pageColGap) / 2;
  const FOOTER_SAFE_Y = height - 72;
  const safeFooterY = (y:number)=>Math.min(y, FOOTER_SAFE_Y);

  const moneyColumnWidth = (pageGridW - 24) / 3;

  const dateLabel = `${safeTravelDates}`;
  const journeyIntro = textLines(journeySummary, pageGridW, 2).join(' ');

  // PAGE 1 — premium cover and pricing card
  doc.setFillColor(18,61,50);
  doc.rect(0, 0, width, 280, 'F');
  doc.setTextColor(247,245,239);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(8.8);
  doc.text('CEYLON WELLNESS', pageGridX, 42);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(8.2);
  doc.text('Your journey to wellness begins in Sri Lanka', pageGridX, 60);

  doc.setFont(pdfFont,'bold');
  doc.setFontSize(31);
  doc.text('PERSONALISED', pageGridX, 116);
  doc.text('WELLNESS JOURNEY', pageGridX, 152);

  doc.setDrawColor(182,154,98);
  doc.line(pageGridX, 168, pageGridX + 190, 168);

  doc.setFont(pdfFont,'normal');
  doc.setFontSize(12.5);
  doc.text('SRI LANKA', pageGridX, 196);

  doc.setFillColor(247,245,239);
  doc.rect(0, 280, width, height - 280, 'F');

  doc.setTextColor(24,32,29);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(9.1);
  doc.text('Prepared especially for', pageGridX, 324);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(22);
  doc.text(safeName, pageGridX, 358);

  doc.setTextColor(79,89,86);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(8.8);
  doc.text(`${dateLabel}    •    ${travellerCount} Travellers    •    ${safeRef}`, pageGridX, 384);

  doc.setTextColor(67,75,71);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(9.2);
  const introLines = textLines(safeJourneySummary, pageGridW, 2);
  introLines.forEach((line: string, index: number)=>{ doc.text(line, pageGridX, 408 + index * 14); });

  doc.setFillColor(255,255,255);
  doc.roundedRect(pageGridX, 455, pageGridW, 94, 8, 8, 'F');
  doc.setDrawColor(222,230,223);
  doc.roundedRect(pageGridX, 455, pageGridW, 94, 8, 8, 'S');

  const priceColY = 483;
  const priceColX = [pageGridX, pageGridX + moneyColumnWidth + 12, pageGridX + (moneyColumnWidth + 12) * 2];
  const priceCols = [
    {value: totalValue, label: 'Total journey'},
    {value: reserveValue, label: 'Reserve your journey'},
    {value: balanceValue, label: 'Balance'}
  ];

  priceCols.forEach((entry, index)=>{
    const x = priceColX[index];
    const widthCol = moneyColumnWidth;
    doc.setDrawColor(221,230,223);
    if(index > 0){ doc.line(x, 474, x, 532); }
    doc.setTextColor(55,71,66);
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(8.8);
    doc.text(String(entry.value), x + 12, priceColY, {maxWidth: widthCol - 12});
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(8.2);
    doc.text(String(entry.label), x + 12, priceColY + 24, {maxWidth: widthCol - 12});
  });

  doc.setTextColor(90,101,96);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(7.5);
  doc.text(quotationText, pageGridX + 12, 548);

  // PAGE 2 — overview and first 3 days
  doc.addPage();
  drawHeader(2, safeRef);
  doc.setTextColor(18,32,29);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(21);
  doc.text('Your journey at a glance', pageGridX, 96);

  doc.setTextColor(91,100,95);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(9.2);
  const introSummary = textLines(journeySummary, pageGridW, 2);
  introSummary.forEach((line: string, index: number)=>{ doc.text(line, pageGridX, 118 + index * 12); });

  doc.setDrawColor(216,218,214);
  doc.line(pageGridX, 152, width - pageGridX, 152);

  const overviewCards = [
    ['Arrival', `${arrivalAirport} · ${landingTime}`],
    ['Welcome', airportPickup],
    ['Stay', accommodation],
    ['Private travel', transport],
    ['Journey style', safeJourneySummary],
  ];

  overviewCards.forEach(([label, value], index)=>{
    const x = pageGridX + (index % 2) * (pageColW + pageColGap);
    const y = 170 + Math.floor(index / 2) * 68;
    doc.setTextColor(98,112,106);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(7.5);
    doc.text(String(label), x, y);
    doc.setTextColor(20,32,29);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(11.2);
    const lines = textLines(String(value), pageColW - 10, 2);
    doc.text(lines[0] || '', x, y + 18);
    if(lines[1]) doc.text(lines[1], x, y + 32);
  });

  doc.setDrawColor(216,218,214);
  doc.line(pageGridX, 390, width - pageGridX, 390);
  doc.setTextColor(18,32,29);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(18);
  doc.text('Your Sri Lankan journey', pageGridX, 430);
  doc.setTextColor(93,104,98);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(8.5);
  doc.text('Days 01–03', width - pageGridX, 430, {align:'right'});

  let dayY = 456;
  const page2DayGap = 118;
  const page2DayLimit = FOOTER_SAFE_Y - 12;
  const page2Days = itinerary.slice(0, 3);
  page2Days.forEach((day)=>{
    const timelineX = pageGridX + 4;
    doc.setDrawColor(182,154,98);
    doc.circle(timelineX, dayY + 8, 3, 'F');
    doc.line(timelineX, dayY + 11, timelineX, dayY + 92);

    doc.setTextColor(90,101,95);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(7.4);
    doc.text(`DAY ${String(day.day).padStart(2,'0')}`, pageGridX + 18, safeFooterY(dayY + 4));

    doc.setTextColor(20,32,29);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(15.5);
    doc.text(String(day.place), pageGridX + 18, safeFooterY(dayY + 20));

    const focusValue = String(day.focus);
    const activityValue = String(day.activity);
    const hideActivity = shouldHideDuplicateActivity(focusValue, activityValue);
    const showFocus = focusValue && !hideActivity && focusValue !== activityValue;

    if(showFocus){
      doc.setTextColor(82,93,87);
      doc.setFont(pdfFont,'bold');
      doc.setFontSize(10.2);
      const focusLines = textLines(focusValue, pageGridW - 90, 2);
      focusLines.forEach((line: string, lineIndex: number)=>{ doc.text(line, pageGridX + 18, safeFooterY(dayY + 38 + lineIndex * 12)); });
    }

    if(!hideActivity){
      const activityLines = textLines(activityValue, pageGridW - 90, 2);
      activityLines.forEach((line: string, lineIndex: number)=>{
        const baseY = dayY + (showFocus ? 60 : 38) + lineIndex * 12;
        doc.setTextColor(32,41,38);
        doc.setFont(pdfFont,'normal');
        doc.setFontSize(9.2);
        doc.text(line, pageGridX + 18, safeFooterY(baseY));
      });
    }

    const stayBaseY = dayY + (showFocus ? 90 : 68) + ((!hideActivity ? textLines(activityValue, pageGridW - 90, 2).length : 0) * 12);
    doc.setTextColor(82,93,87);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(7.4);
    doc.text('STAY', pageGridX + 18, safeFooterY(stayBaseY));
    doc.setTextColor(25,33,30);
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(8.8);
    doc.text(String(day.stay), pageGridX + 64, safeFooterY(stayBaseY));

    if(day.notes && isMeaningfulText(day.notes)){
      const noteBoxY = stayBaseY + 16;
      const noteBoxBottom = noteBoxY + 18;
      if(noteBoxBottom < page2DayLimit){
        doc.setFillColor(221,230,223);
        doc.roundedRect(pageGridX + 18, noteBoxY, pageGridW - 30, 18, 6, 6, 'F');
        doc.setTextColor(22,39,34);
        doc.setFont(pdfFont,'normal');
        doc.setFontSize(8.1);
        doc.text(String(day.notes), pageGridX + 28, safeFooterY(noteBoxY + 12));
      }
    }

    dayY += page2DayGap;
    if(dayY > page2DayLimit - 60){ dayY = page2DayLimit - 60; }
  });

  // PAGE 3 — keep the two-column rhythm with calmer spacing
  doc.addPage();
  drawHeader(3, safeRef);
  doc.setTextColor(18,32,29);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(18);
  doc.text('Your Sri Lankan journey', pageGridX, 96);
  doc.setTextColor(87,98,93);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(8.6);
  doc.text('Days 04–09', width - pageGridX, 96, {align:'right'});

  const leftColX = pageGridX;
  const rightColX = width / 2 + 18;
  const page3Gap = 18;
  const page3ColW = (pageGridW - page3Gap) / 2;
  const page3Group = [itinerary.slice(3, 6), itinerary.slice(6, 9)];

  page3Group.forEach((group, columnIndex)=>{
    const startX = columnIndex === 0 ? leftColX : rightColX;
    let currentY = 122;

    group.forEach((day)=>{
      const dayNumber = `DAY ${String(day.day).padStart(2,'0')}`;
      doc.setDrawColor(182,154,98);
      doc.line(startX + 8, currentY + 2, startX + 8, currentY + 118);
      doc.circle(startX + 8, currentY + 12, 3, 'F');

      doc.setTextColor(94,104,98);
      doc.setFont(pdfFont,'bold');
      doc.setFontSize(7.3);
      doc.text(dayNumber, startX + 22, currentY + 6);

      doc.setTextColor(22,32,29);
      doc.setFont(pdfFont,'bold');
      doc.setFontSize(14.2);
      const placeLines = textLines(String(day.place), page3ColW - 18, 2);
      doc.text(placeLines[0] || '', startX + 22, currentY + 24);
      if(placeLines[1]) doc.text(placeLines[1], startX + 22, currentY + 38);

      const focusValue = String(day.focus);
      const activityValue = String(day.activity);
      const hideActivity = shouldHideDuplicateActivity(focusValue, activityValue);
      const showFocus = focusValue && !hideActivity && focusValue !== activityValue;
      if(showFocus){
        doc.setTextColor(75,88,82);
        doc.setFont(pdfFont,'bold');
        doc.setFontSize(10.1);
        const focusLines = textLines(focusValue, page3ColW - 18, 2);
        focusLines.forEach((line: string, focusIndex: number)=>{ doc.text(line, startX + 22, currentY + 56 + focusIndex * 12); });
      }

      if(!hideActivity){
        const textY = currentY + (showFocus ? 80 : 58);
        doc.setTextColor(35,43,40);
        doc.setFont(pdfFont,'normal');
        doc.setFontSize(8.8);
        const activityLines = textLines(activityValue, page3ColW - 18, 2);
        activityLines.forEach((line: string, lineIndex: number)=>{ doc.text(line, startX + 22, textY + lineIndex * 11); });
      }

      const stayY = currentY + (showFocus ? 98 : 82) + ((!hideActivity ? textLines(activityValue, page3ColW - 18, 2).length : 0) * 11);
      doc.setTextColor(83,99,92);
      doc.setFont(pdfFont,'bold');
      doc.setFontSize(7.2);
      doc.text('Stay ·', startX + 22, stayY);
      doc.setTextColor(26,34,31);
      doc.setFont(pdfFont,'normal');
      doc.setFontSize(8.1);
      doc.text(String(day.stay), startX + 66, stayY);

      currentY += 136;
    });
  });

  // PAGE 4 — calm commercial close, not crowded
  doc.addPage();
  drawHeader(4, safeRef);

  doc.setTextColor(18,32,29);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(19);
  doc.text('Journey arrangements', pageGridX, 96);

  const arrangementCards = [
    ['Accommodation', statusAccommodation],
    ['Private transport', statusTransport],
    ['Wellness & experiences', statusWellness]
  ];
  arrangementCards.forEach(([label, status], index)=>{
    const x = pageGridX + index * (moneyColumnWidth + 18);
    doc.setFillColor(241,243,239);
    doc.roundedRect(x, 118, moneyColumnWidth, 52, 7, 7, 'F');
    doc.setDrawColor(220,228,220);
    doc.roundedRect(x, 118, moneyColumnWidth, 52, 7, 7, 'S');
    doc.setTextColor(114,126,118);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(7.2);
    doc.text(String(label), x + 12, 138);
    doc.setTextColor(25,32,29);
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(8.8);
    doc.text(String(status), x + 12, 154);
  });

  doc.setDrawColor(219,220,216);
  doc.line(pageGridX, 192, width - pageGridX, 192);

  const leftListX = pageGridX;
  const rightListX = width / 2 + 18;
  const page4ColumnGap = 22;
  const page4ColumnW = (pageGridW - page4ColumnGap) / 2;
  const valueColWidth = page4ColumnW;

  doc.setTextColor(18,32,29);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(12);
  doc.text('Included', leftListX, 214);
  doc.text('Not included', rightListX, 214);

  const includeItems = includedText.split(/\s*\n\s*|\s*•\s*|\s*;\s*/).filter(Boolean).slice(0, 6);
  includeItems.forEach((item, index)=>{
    const y = 236 + index * 18;
    doc.setTextColor(22,51,45);
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(8.7);
    doc.text('✓', leftListX, y);
    doc.text(item, leftListX + 14, y, {maxWidth: page4ColumnW - 20});
  });

  const excludeItems = excludedText.split(/\s*\n\s*|\s*•\s*|\s*;\s*/).filter(Boolean).slice(0, 6);
  excludeItems.forEach((item, index)=>{
    const y = 236 + index * 18;
    doc.setTextColor(52,60,57);
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(8.7);
    doc.text('–', rightListX, y);
    doc.text(item, rightListX + 14, y, {maxWidth: page4ColumnW - 20});
  });

  doc.setFillColor(238,242,236);
  doc.roundedRect(pageGridX, 372, pageGridW, 74, 8, 8, 'F');
  doc.setTextColor(18,32,29);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(12);
  doc.text('Your journey investment', pageGridX + 16, 396);

  const investmentX = [pageGridX + 16, pageGridX + 245, pageGridX + 420];
  const investmentRows = [
    {value: totalValue, label: 'Total'},
    {value: reserveValue, label: 'Reservation'},
    {value: balanceValue, label: 'Balance'}
  ];

  investmentRows.forEach((entry, index)=>{
    doc.setTextColor(73,86,82);
    doc.setFont(pdfFont,'normal');
    doc.setFontSize(8.2);
    doc.text(String(entry.label), investmentX[index], 418);
    doc.setTextColor(18,32,29);
    doc.setFont(pdfFont,'bold');
    doc.setFontSize(19);
    doc.text(String(entry.value), investmentX[index], 440);
  });

  const paymentLeftX = pageGridX;
  const paymentRightX = width / 2 + 18;
  const paymentColWidth = (pageGridW - 28) / 2;

  doc.setTextColor(18,32,29);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(12);
  doc.text('Payment information', paymentLeftX, 475);
  doc.text('Cancellation & refund', paymentRightX, 475);

  doc.setDrawColor(218,220,215);
  doc.line(paymentLeftX, 482, paymentLeftX + paymentColWidth - 10, 482);
  doc.line(paymentRightX, 482, paymentRightX + paymentColWidth - 10, 482);

  const paymentBlock = textLines(paymentText, paymentColWidth - 14, 5);
  const refundBlock = textLines(cancellationText, paymentColWidth - 14, 5);

  doc.setTextColor(38,47,44);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(8.7);
  paymentBlock.forEach((line: string, index: number)=>{ doc.text(line, paymentLeftX, 496 + index * 12); });
  refundBlock.forEach((line: string, index: number)=>{ doc.text(line, paymentRightX, 496 + index * 12); });

  doc.setFillColor(19,61,50);
  doc.rect(0, 636, width, 132, 'F');
  doc.setTextColor(247,245,239);
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(19);
  doc.text('YOUR JOURNEY.', width / 2, 668, {align:'center'});
  doc.text('YOUR WELLNESS.', width / 2, 694, {align:'center'});
  doc.text('YOUR SRI LANKA.', width / 2, 720, {align:'center'});

  doc.setTextColor(247,245,239);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(9.2);
  doc.text(`Thank you, ${safeName.split(' ')[0] || 'traveller'}.`, width / 2, 750, {align:'center'});
  doc.setFont(pdfFont,'bold');
  doc.setFontSize(8.8);
  doc.text('CEYLON WELLNESS', pageGridX, 766);
  doc.setFont(pdfFont,'normal');
  doc.setFontSize(8.2);
  doc.text('WhatsApp +48 696 741 450', pageGridX, 780);
  doc.text('support@ceylonwellness.com', pageGridX, 792);

  const totalPages = 4;
  for(let pageIndex = 2; pageIndex <= totalPages; pageIndex++){
    drawFooter(pageIndex, totalPages);
  }

  doc.save(`${fileSlug}.pdf`);
};

const finalDocCopy:Record<Lang,Record<string,string>>={
 EN:{setup:'Final journey document',setupSub:'Prepare the traveller-facing version. Planner notes stay internal and are hidden from the final document.',name:'Traveller / group name',ref:'Journey reference',prepared:'Prepared by',note:'Welcome / final note',preview:'Traveller preview',edit:'Planner edit',pdf:'Download / Save PDF',finalTitle:'Your Ceylon Wellness Journey',brief:'Journey summary',itinerary:'Your day-by-day journey',location:'Location',focus:'Wellness focus',plan:'Plan',stay:'Stay / hotel',internal:'Planner note',terms:'Booking & payment notes',draft:'DRAFT · subject to human confirmation',ready:'Traveller version ready',printHint:'In the print window choose “Save as PDF”.',quote:'Final quotation is issued separately after availability, supplier terms and the traveller-approved plan are confirmed.'},
 PL:{setup:'Finalny dokument podróży',setupSub:'Przygotuj wersję dla podróżnego. Notatki planisty pozostają wewnętrzne i nie pojawiają się w dokumencie końcowym.',name:'Podróżny / nazwa grupy',ref:'Numer podróży',prepared:'Przygotował(a)',note:'Powitanie / uwaga końcowa',preview:'Podgląd dla podróżnego',edit:'Edycja planisty',pdf:'Pobierz / zapisz PDF',finalTitle:'Twoja podróż Ceylon Wellness',brief:'Podsumowanie podróży',itinerary:'Plan dzień po dniu',location:'Miejsce',focus:'Cel wellness',plan:'Plan',stay:'Nocleg / hotel',internal:'Notatka planisty',terms:'Rezerwacja i płatności',draft:'WERSJA ROBOCZA · wymaga potwierdzenia',ready:'Wersja dla podróżnego gotowa',printHint:'W oknie drukowania wybierz „Zapisz jako PDF”.',quote:'Końcowa wycena jest wysyłana osobno po potwierdzeniu dostępności, warunków dostawców i zaakceptowaniu planu przez podróżnego.'},
 RU:{setup:'Итоговый документ поездки',setupSub:'Подготовьте версию для путешественника. Внутренние заметки планировщика не отображаются в итоговом документе.',name:'Путешественник / группа',ref:'Номер поездки',prepared:'Подготовил(а)',note:'Приветствие / итоговая заметка',preview:'Версия для путешественника',edit:'Редактирование планировщика',pdf:'Скачать / сохранить PDF',finalTitle:'Ваше путешествие Ceylon Wellness',brief:'Краткое описание поездки',itinerary:'Маршрут по дням',location:'Место',focus:'Велнес-фокус',plan:'План',stay:'Проживание / отель',internal:'Заметка планировщика',terms:'Бронирование и оплата',draft:'ЧЕРНОВИК · требуется подтверждение',ready:'Версия для путешественника готова',printHint:'В окне печати выберите «Сохранить как PDF».',quote:'Финальное предложение отправляется отдельно после подтверждения наличия, условий поставщиков и одобрения маршрута путешественником.'},
 DE:{setup:'Finales Reisedokument',setupSub:'Bereiten Sie die Version für den Reisenden vor. Interne Planer-Notizen werden im finalen Dokument ausgeblendet.',name:'Reisender / Gruppenname',ref:'Reisereferenz',prepared:'Erstellt von',note:'Willkommen / Abschlussnotiz',preview:'Reisenden-Vorschau',edit:'Planer bearbeiten',pdf:'PDF herunterladen / speichern',finalTitle:'Ihre Ceylon Wellness Reise',brief:'Reiseübersicht',itinerary:'Ihre Reise Tag für Tag',location:'Ort',focus:'Wellness-Fokus',plan:'Plan',stay:'Unterkunft / Hotel',internal:'Planer-Notiz',terms:'Buchung & Zahlung',draft:'ENTWURF · menschliche Bestätigung erforderlich',ready:'Reisendenversion bereit',printHint:'Im Druckfenster „Als PDF speichern“ wählen.',quote:'Das endgültige Angebot wird separat erstellt, nachdem Verfügbarkeit, Lieferantenbedingungen und der vom Reisenden genehmigte Plan bestätigt wurden.'},
 FR:{setup:'Document final du voyage',setupSub:'Préparez la version destinée au voyageur. Les notes internes du planificateur sont masquées dans le document final.',name:'Voyageur / nom du groupe',ref:'Référence du voyage',prepared:'Préparé par',note:'Bienvenue / note finale',preview:'Aperçu voyageur',edit:'Modifier le plan',pdf:'Télécharger / enregistrer PDF',finalTitle:'Votre voyage Ceylon Wellness',brief:'Résumé du voyage',itinerary:'Votre voyage jour par jour',location:'Lieu',focus:'Objectif bien-être',plan:'Programme',stay:'Séjour / hôtel',internal:'Note du planificateur',terms:'Réservation & paiement',draft:'BROUILLON · confirmation humaine requise',ready:'Version voyageur prête',printHint:'Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ». ',quote:'Le devis final est envoyé séparément après confirmation des disponibilités, des conditions des fournisseurs et de l’itinéraire approuvé par le voyageur.'}
};


const contactCopy:Record<Lang,Record<string,string>>={
 EN:{title:'How should we contact you?',sub:'Keep it simple. These details stay in your browser until you choose to send the journey request. Ceylon Wellness uses them to respond, prepare your plan and deliver approved travel documents — not for marketing unless you separately agree later.',name:'First name / group name',email:'Email for final plan',phone:'WhatsApp / phone',language:'Preferred language',delivery:'Preferred delivery',emailWa:'Email + WhatsApp',waOnly:'WhatsApp only',privacy:'I understand that my contact details will be included in the message I choose to send to Ceylon Wellness for this journey request.',privacyLink:'Privacy information',safe:'No account · no public profile · no passport upload',required:'Add your name, a valid email, WhatsApp/phone and confirm the privacy notice to continue.'},
 PL:{title:'Jak mamy się z Tobą skontaktować?',sub:'Prosto i bezpiecznie. Dane pozostają w przeglądarce do momentu, gdy zdecydujesz się wysłać zapytanie. Ceylon Wellness używa ich do odpowiedzi, przygotowania planu i przekazania zatwierdzonych dokumentów podróży.',name:'Imię / nazwa grupy',email:'E-mail do finalnego planu',phone:'WhatsApp / telefon',language:'Preferowany język',delivery:'Sposób kontaktu',emailWa:'E-mail + WhatsApp',waOnly:'Tylko WhatsApp',privacy:'Rozumiem, że moje dane kontaktowe zostaną dołączone do wiadomości, którą samodzielnie wyślę do Ceylon Wellness w sprawie tej podróży.',privacyLink:'Informacja o prywatności',safe:'Bez konta · bez publicznego profilu · bez przesyłania paszportu',required:'Podaj imię, prawidłowy e-mail, WhatsApp/telefon i zaakceptuj informację o prywatności.'},
 RU:{title:'Как с вами связаться?',sub:'Просто и безопасно. Эти данные остаются в браузере, пока вы сами не решите отправить запрос. Ceylon Wellness использует их для ответа, подготовки плана и отправки согласованных документов поездки.',name:'Имя / название группы',email:'Email для финального плана',phone:'WhatsApp / телефон',language:'Предпочтительный язык',delivery:'Способ связи',emailWa:'Email + WhatsApp',waOnly:'Только WhatsApp',privacy:'Я понимаю, что мои контактные данные будут включены в сообщение, которое я решу отправить Ceylon Wellness по этому запросу.',privacyLink:'Информация о конфиденциальности',safe:'Без аккаунта · без публичного профиля · без загрузки паспорта',required:'Укажите имя, корректный email, WhatsApp/телефон и подтвердите уведомление о конфиденциальности.'},
 DE:{title:'Wie dürfen wir Sie kontaktieren?',sub:'Einfach und datensparsam. Diese Angaben bleiben in Ihrem Browser, bis Sie die Reiseanfrage selbst senden. Ceylon Wellness nutzt sie zur Antwort, Reiseplanung und Zustellung freigegebener Reisedokumente.',name:'Vorname / Gruppenname',email:'E-Mail für den finalen Plan',phone:'WhatsApp / Telefon',language:'Bevorzugte Sprache',delivery:'Bevorzugte Zustellung',emailWa:'E-Mail + WhatsApp',waOnly:'Nur WhatsApp',privacy:'Ich verstehe, dass meine Kontaktdaten in die Nachricht aufgenommen werden, die ich für diese Reiseanfrage an Ceylon Wellness sende.',privacyLink:'Datenschutzhinweis',safe:'Kein Konto · kein öffentliches Profil · kein Pass-Upload',required:'Bitte Name, gültige E-Mail und WhatsApp/Telefon angeben und den Datenschutzhinweis bestätigen.'},
 FR:{title:'Comment pouvons-nous vous contacter ?',sub:'Simple et respectueux de vos données. Ces informations restent dans votre navigateur jusqu’à ce que vous décidiez d’envoyer la demande. Ceylon Wellness les utilise pour répondre, préparer votre voyage et transmettre les documents approuvés.',name:'Prénom / nom du groupe',email:'E-mail pour le plan final',phone:'WhatsApp / téléphone',language:'Langue préférée',delivery:'Mode de contact',emailWa:'E-mail + WhatsApp',waOnly:'WhatsApp uniquement',privacy:'Je comprends que mes coordonnées seront incluses dans le message que je choisis d’envoyer à Ceylon Wellness pour cette demande de voyage.',privacyLink:'Informations de confidentialité',safe:'Sans compte · sans profil public · sans passeport à télécharger',required:'Ajoutez votre nom, un e-mail valide, WhatsApp/téléphone et confirmez l’information de confidentialité.'}
};
Object.assign(contactCopy.EN,{saveError:'We could not save the secure request copy. Your WhatsApp message can still be sent.'});
Object.assign(contactCopy.PL,{saveError:'Nie udało się zapisać bezpiecznej kopii zapytania. Nadal możesz wysłać wiadomość przez WhatsApp.'});
Object.assign(contactCopy.RU,{saveError:'Не удалось сохранить защищённую копию запроса. Вы всё ещё можете отправить сообщение через WhatsApp.'});
Object.assign(contactCopy.DE,{saveError:'Die geschützte Anfragekopie konnte nicht gespeichert werden. Sie können die WhatsApp-Nachricht trotzdem senden.'});
Object.assign(contactCopy.FR,{saveError:'La copie sécurisée de la demande n’a pas pu être enregistrée. Vous pouvez tout de même envoyer le message WhatsApp.'});

type TCopy={nav:string[],hero:string,sub:string,design:string,ask:string,human:string,feel:string,smart:string,smartSub:string,start:string,free:string,days:string,daysSub:string,feelQ:string,interestQ:string,paceQ:string,partyQ:string,next:string,back:string,result:string,resultSub:string,send:string,restart:string,summary:string,route:string,disclaimer:string,public?:Record<string,string>};
const copy:Record<Lang,TCopy>={
 EN:{nav:['Wellness','Sri Lanka','Dr. Vipula','Reiki','About'],hero:'Your journey to wellness begins in Sri Lanka.',sub:'A calm, personalised way to discover Sri Lanka through wellbeing, nature, spirituality and meaningful travel.',design:'Design my journey',ask:'Ask Ceylon',human:'Human support',feel:'How would you like to feel?',smart:'Your free smart Sri Lanka guide',smartSub:'Choose what matters to you. Ask Ceylon shapes a simple journey idea on your device, then sends it to a real person when you are ready.',start:'Start free guide',free:'100% free · no login · no AI/API fees',days:'How long is your journey?',daysSub:'Choose the closest option. We will keep the route realistic.',feelQ:'How would you like to feel?',interestQ:'What calls to you?',paceQ:'What pace feels right?',partyQ:'Who are you travelling with?',next:'Continue',back:'Back',result:'Your Ceylon journey idea',resultSub:'A starting point based on your choices — simple, flexible and ready for human refinement.',send:'Send my journey to WhatsApp',restart:'Start again',summary:'Your choices',route:'Suggested rhythm',disclaimer:'This is a free planning guide, not a confirmed booking. Prices, availability and final arrangements are confirmed by a human.'},
 PL:{nav:['Wellness','Sri Lanka','Dr Vipula','Reiki','O nas'],hero:'Twoja podróż ku dobremu samopoczuciu zaczyna się na Sri Lance.',sub:'Spokojny, spersonalizowany sposób odkrywania Sri Lanki poprzez wellbeing, naturę, duchowość i świadome podróżowanie.',design:'Zaprojektuj podróż',ask:'Zapytaj Ceylon',human:'Pomoc człowieka',feel:'Jak chcesz się czuć?',smart:'Twój bezpłatny inteligentny przewodnik po Sri Lance',smartSub:'Wybierz to, co jest dla Ciebie ważne. Ask Ceylon przygotuje prosty pomysł podróży, a gdy będziesz gotowy, przekaże go prawdziwemu koordynatorowi.',start:'Uruchom bezpłatny przewodnik',free:'100% bezpłatnie · bez logowania · bez opłat API',days:'Jak długo potrwa Twoja podróż?',daysSub:'Wybierz najbliższą opcję. Trasa pozostanie realistyczna.',feelQ:'Jak chcesz się czuć?',interestQ:'Co Cię najbardziej przyciąga?',paceQ:'Jakie tempo Ci odpowiada?',partyQ:'Z kim podróżujesz?',next:'Dalej',back:'Wstecz',result:'Twój pomysł na podróż po Cejlonie',resultSub:'Punkt wyjścia oparty na Twoich wyborach — prosty, elastyczny i gotowy do dopracowania z człowiekiem.',send:'Wyślij podróż przez WhatsApp',restart:'Zacznij ponownie',summary:'Twoje wybory',route:'Sugerowany rytm',disclaimer:'To bezpłatny przewodnik planowania, a nie potwierdzona rezerwacja. Ceny, dostępność i finalne ustalenia potwierdza człowiek.'},
 RU:{nav:['Велнес','Шри-Ланка','Д-р Випула','Рейки','О нас'],hero:'Ваше путешествие к благополучию начинается на Шри-Ланке.',sub:'Спокойный персональный способ открыть Шри-Ланку через велнес, природу, духовность и осознанные путешествия.',design:'Создать путешествие',ask:'Спросить Ceylon',human:'Помощь человека',feel:'Как вы хотите себя чувствовать?',smart:'Ваш бесплатный умный гид по Шри-Ланке',smartSub:'Выберите то, что важно для вас. Ask Ceylon создаст простую идею маршрута на вашем устройстве и передаст её координатору, когда вы будете готовы.',start:'Открыть бесплатный гид',free:'100% бесплатно · без входа · без оплаты API',days:'Сколько дней длится поездка?',daysSub:'Выберите ближайший вариант — маршрут останется реалистичным.',feelQ:'Как вы хотите себя чувствовать?',interestQ:'Что вас привлекает?',paceQ:'Какой темп вам подходит?',partyQ:'С кем вы путешествуете?',next:'Далее',back:'Назад',result:'Ваша идея путешествия по Цейлону',resultSub:'Отправная точка на основе ваших выборов — простая, гибкая и готовая к уточнению с человеком.',send:'Отправить маршрут в WhatsApp',restart:'Начать заново',summary:'Ваш выбор',route:'Предлагаемый ритм',disclaimer:'Это бесплатный планировщик, а не подтверждённое бронирование. Цены, наличие и финальные детали подтверждает человек.'},
 DE:{nav:['Wellness','Sri Lanka','Dr. Vipula','Reiki','Über uns'],hero:'Ihre Wellness-Reise beginnt in Sri Lanka.',sub:'Sri Lanka ruhig und persönlich erleben – mit Wellness, Natur, Spiritualität und bewusstem Reisen.',design:'Reise gestalten',ask:'Ceylon fragen',human:'Persönliche Hilfe',feel:'Wie möchten Sie sich fühlen?',smart:'Ihr kostenloser smarter Sri-Lanka-Guide',smartSub:'Wählen Sie, was Ihnen wichtig ist. Ask Ceylon erstellt direkt auf Ihrem Gerät eine einfache Reiseidee und übergibt sie bei Bedarf an einen echten Ansprechpartner.',start:'Kostenlosen Guide starten',free:'100% kostenlos · kein Login · keine API-Gebühren',days:'Wie lange dauert Ihre Reise?',daysSub:'Wählen Sie die passendste Option. Die Route bleibt realistisch.',feelQ:'Wie möchten Sie sich fühlen?',interestQ:'Was interessiert Sie?',paceQ:'Welches Tempo passt zu Ihnen?',partyQ:'Mit wem reisen Sie?',next:'Weiter',back:'Zurück',result:'Ihre Ceylon-Reiseidee',resultSub:'Ein Ausgangspunkt nach Ihren Wünschen — einfach, flexibel und bereit für die persönliche Feinplanung.',send:'Reise per WhatsApp senden',restart:'Neu starten',summary:'Ihre Auswahl',route:'Empfohlener Rhythmus',disclaimer:'Dies ist ein kostenloser Planungshelfer, keine bestätigte Buchung. Preise, Verfügbarkeit und endgültige Arrangements bestätigt ein Mensch.'},
 FR:{nav:['Bien-être','Sri Lanka','Dr Vipula','Reiki','À propos'],hero:'Votre voyage vers le bien-être commence au Sri Lanka.',sub:'Une façon calme et personnalisée de découvrir le Sri Lanka à travers le bien-être, la nature, la spiritualité et un voyage conscient.',design:'Créer mon voyage',ask:'Demander à Ceylon',human:'Aide humaine',feel:'Comment souhaitez-vous vous sentir ?',smart:'Votre guide intelligent gratuit du Sri Lanka',smartSub:'Choisissez ce qui compte pour vous. Ask Ceylon crée une idée de voyage simple sur votre appareil, puis la transmet à une vraie personne lorsque vous êtes prêt.',start:'Lancer le guide gratuit',free:'100% gratuit · sans connexion · sans frais API',days:'Combien de temps dure votre voyage ?',daysSub:'Choisissez l’option la plus proche. Nous gardons un itinéraire réaliste.',feelQ:'Comment souhaitez-vous vous sentir ?',interestQ:'Qu’est-ce qui vous attire ?',paceQ:'Quel rythme vous convient ?',partyQ:'Avec qui voyagez-vous ?',next:'Continuer',back:'Retour',result:'Votre idée de voyage à Ceylan',resultSub:'Un point de départ basé sur vos choix — simple, flexible et prêt à être affiné avec une personne.',send:'Envoyer mon voyage sur WhatsApp',restart:'Recommencer',summary:'Vos choix',route:'Rythme suggéré',disclaimer:'Ceci est un guide de planification gratuit, pas une réservation confirmée. Les prix, disponibilités et arrangements finaux sont confirmés par une personne.'}
};

Object.assign(copy.EN,{public:{brandTagline:'Your Journey to Wellness Begins in Sri Lanka',footerIntro:'Personalised wellness journeys in Sri Lanka. Free planning with human-confirmed bookings, prices and availability.',explore:'Explore',contact:'Contact',privacy:'Privacy',wellnessNotice:'Wellness information is not medical advice.',whatsapp:'WhatsApp',introEyebrow:'WELLNESS, PERSONALISED',guideEyebrow:'ASK CEYLON · FREE SMART GUIDE',chipNoApi:'No API',chipNoAccount:'No account',chipLanguages:'5 languages',chipWhatsApp:'WhatsApp handoff',journeyEyebrow:'SRI LANKA, AT YOUR PACE',journeyHeading:'Choose a feeling, not a checklist.',teaCountry:'Tea Country',teaDescription:'Cool mountains, tea landscapes and slow mornings.',oceanCoast:'Ocean & Coast',oceanDescription:'Space to breathe beside the Indian Ocean.',natureWildlife:'Nature & Wildlife',natureDescription:'Forests, waterfalls and extraordinary biodiversity.',cultureSpirit:'Culture & Spirit',cultureDescription:'Living traditions, reflection and meaningful encounters.',peopleEyebrow:'PEOPLE BEHIND CEYLON WELLNESS',peopleHeading:'Smart planning helps. People take responsibility.',founderRole:'Founder · Ceylon Wellness',founderDescription:'Founder, customer coordination and the main point of contact. Enquiries are centrally managed through WhatsApp.',vipulaRole:'Wellness · Sri Lanka · Reiki',vipulaDescription:'Authorised profile content supporting the wellness, meditation, spirituality and Reiki experience.',meetVipula:'Meet Dr. Vipula →',reikiRole:'Online Reiki',reikiDescription:'Online Reiki enquiries with supplied Level One and Level Two certificate documentation.',exploreReiki:'Explore Online Reiki →',partnerEyebrow:'GROUND HANDLING IN SRI LANKA',partnerDescription:'Independent Sri Lankan ground-handling partner for travel coordination. Ceylon Wellness remains focused on the wellness journey.',partnerLink:'Visit partner website',ctaEyebrow:'HUMAN WHEN IT MATTERS',ctaHeading:'Ready to make it real?',ctaDescription:'Use the free guide to shape your idea. Our human coordinator confirms availability, pricing and next steps personally.',ctaButton:'Talk on WhatsApp',humanTitle:'Prefer a real person?',humanDescription:'WhatsApp stays free and available at every step.',humanMessage:'Hello Ceylon Wellness. I prefer human help with my Sri Lanka journey.'}});
Object.assign(copy.PL,{public:{brandTagline:'Twoja podróż ku dobremu samopoczuciu zaczyna się na Sri Lance',footerIntro:'Spersonalizowane podróże wellness na Sri Lance. Bezpłatne planowanie, a rezerwacje, ceny i dostępność potwierdza człowiek.',explore:'Odkrywaj',contact:'Kontakt',privacy:'Prywatność',wellnessNotice:'Informacje o wellness nie zastępują porady medycznej.',whatsapp:'WhatsApp',introEyebrow:'WELLNESS DOPASOWANE DO CIEBIE',guideEyebrow:'ASK CEYLON · BEZPŁATNY INTELIGENTNY PRZEWODNIK',chipNoApi:'Bez API',chipNoAccount:'Bez konta',chipLanguages:'5 języków',chipWhatsApp:'Kontakt przez WhatsApp',journeyEyebrow:'SRI LANKA WE WŁASNYM TEMPIE',journeyHeading:'Wybierz samopoczucie, nie listę zadań.',teaCountry:'Kraina herbaty',teaDescription:'Chłodne góry, herbaciane krajobrazy i spokojne poranki.',oceanCoast:'Ocean i wybrzeże',oceanDescription:'Oddech i przestrzeń nad Oceanem Indyjskim.',natureWildlife:'Natura i dzika przyroda',natureDescription:'Lasy, wodospady i niezwykła różnorodność przyrody.',cultureSpirit:'Kultura i duchowość',cultureDescription:'Żywe tradycje, refleksja i wartościowe spotkania.',peopleEyebrow:'LUDZIE CEYLON WELLNESS',peopleHeading:'Technologia pomaga. Odpowiedzialność biorą ludzie.',founderRole:'Założyciel · Ceylon Wellness',founderDescription:'Założyciel, koordynator klienta i główny punkt kontaktu. Zapytania obsługujemy przez WhatsApp.',vipulaRole:'Wellness · Sri Lanka · Reiki',vipulaDescription:'Zatwierdzone informacje o profilu wspierające ofertę wellness, medytacji, duchowości i Reiki.',meetVipula:'Poznaj dr. Vipulę →',reikiRole:'Reiki online',reikiDescription:'Zapytania o Reiki online wraz z dokumentacją certyfikatów pierwszego i drugiego stopnia.',exploreReiki:'Poznaj Reiki online →',partnerEyebrow:'OBSŁUGA PODRÓŻY NA SRI LANCE',partnerDescription:'Niezależny lankijski partner obsługi naziemnej wspiera organizację podróży. Ceylon Wellness koncentruje się na podróży wellness.',partnerLink:'Odwiedź stronę partnera',ctaEyebrow:'CZŁOWIEK, GDY TO WAŻNE',ctaHeading:'Gotowi, by wcielić plan w życie?',ctaDescription:'Bezpłatny przewodnik pomoże ułożyć pomysł. Nasz koordynator osobiście potwierdzi dostępność, ceny i dalsze kroki.',ctaButton:'Napisz przez WhatsApp',humanTitle:'Wolisz porozmawiać z człowiekiem?',humanDescription:'WhatsApp jest bezpłatny i dostępny na każdym etapie.',humanMessage:'Dzień dobry Ceylon Wellness. Proszę o pomoc człowieka w zaplanowaniu podróży na Sri Lankę.'}});
Object.assign(copy.RU,{public:{brandTagline:'Ваше путешествие к благополучию начинается на Шри-Ланке',footerIntro:'Персональные wellness-путешествия по Шри-Ланке. Планирование бесплатно; бронирование, цены и наличие подтверждает специалист.',explore:'Разделы',contact:'Контакты',privacy:'Конфиденциальность',wellnessNotice:'Информация о wellness не заменяет медицинскую консультацию.',whatsapp:'WhatsApp',introEyebrow:'WELLNESS С УЧЁТОМ ВАШИХ ПОЖЕЛАНИЙ',guideEyebrow:'ASK CEYLON · БЕСПЛАТНЫЙ УМНЫЙ ГИД',chipNoApi:'Без API',chipNoAccount:'Без аккаунта',chipLanguages:'5 языков',chipWhatsApp:'Связь через WhatsApp',journeyEyebrow:'ШРИ-ЛАНКА В ВАШЁМ ТЕМПЕ',journeyHeading:'Выберите ощущения, а не список дел.',teaCountry:'Чайный край',teaDescription:'Прохладные горы, чайные пейзажи и спокойные утра.',oceanCoast:'Океан и побережье',oceanDescription:'Простор и отдых у Индийского океана.',natureWildlife:'Природа и животный мир',natureDescription:'Леса, водопады и удивительное разнообразие природы.',cultureSpirit:'Культура и духовность',cultureDescription:'Живые традиции, размышления и важные встречи.',peopleEyebrow:'КОМАНДА CEYLON WELLNESS',peopleHeading:'Планирование помогает. Ответственность несут люди.',founderRole:'Основатель · Ceylon Wellness',founderDescription:'Основатель, координатор клиентов и главный контакт. Запросы централизованно принимаются через WhatsApp.',vipulaRole:'Wellness · Шри-Ланка · Reiki',vipulaDescription:'Утверждённая информация о специалисте для направлений wellness, медитации, духовных практик и Reiki.',meetVipula:'Познакомиться с доктором Випулой →',reikiRole:'Онлайн Reiki',reikiDescription:'Запросы об онлайн Reiki и предоставленная документация сертификатов первого и второго уровней.',exploreReiki:'Подробнее об онлайн Reiki →',partnerEyebrow:'ОРГАНИЗАЦИЯ ПОЕЗДОК НА ШРИ-ЛАНКЕ',partnerDescription:'Независимый местный партнёр помогает с организацией поездок. Ceylon Wellness сосредоточена на wellness-путешествиях.',partnerLink:'Перейти на сайт партнёра',ctaEyebrow:'ЛИЧНОЕ УЧАСТИЕ, КОГДА ОНО ВАЖНО',ctaHeading:'Готовы воплотить план?',ctaDescription:'Бесплатный гид поможет сформировать идею. Наш координатор лично подтвердит наличие мест, цены и дальнейшие шаги.',ctaButton:'Написать в WhatsApp',humanTitle:'Предпочитаете поговорить со специалистом?',humanDescription:'WhatsApp бесплатен и доступен на каждом этапе.',humanMessage:'Здравствуйте, Ceylon Wellness. Мне нужна помощь специалиста в планировании поездки на Шри-Ланку.'}});
Object.assign(copy.DE,{public:{brandTagline:'Ihre Reise zum Wohlbefinden beginnt in Sri Lanka',footerIntro:'Persönliche Wellness-Reisen in Sri Lanka. Die Planung ist kostenlos; Buchungen, Preise und Verfügbarkeit bestätigt ein Mensch.',explore:'Entdecken',contact:'Kontakt',privacy:'Datenschutz',wellnessNotice:'Wellness-Informationen ersetzen keine medizinische Beratung.',whatsapp:'WhatsApp',introEyebrow:'WELLNESS, PERSÖNLICH GESTALTET',guideEyebrow:'ASK CEYLON · KOSTENLOSER SMARTER GUIDE',chipNoApi:'Keine API',chipNoAccount:'Kein Konto',chipLanguages:'5 Sprachen',chipWhatsApp:'Übergabe per WhatsApp',journeyEyebrow:'SRI LANKA IM EIGENEN TEMPO',journeyHeading:'Wählen Sie ein Gefühl, keine Checkliste.',teaCountry:'Teeland',teaDescription:'Kühle Berge, Teelandschaften und ruhige Morgen.',oceanCoast:'Ozean und Küste',oceanDescription:'Raum zum Durchatmen am Indischen Ozean.',natureWildlife:'Natur und Tierwelt',natureDescription:'Wälder, Wasserfälle und außergewöhnliche Artenvielfalt.',cultureSpirit:'Kultur und Spiritualität',cultureDescription:'Lebendige Traditionen, Besinnung und bereichernde Begegnungen.',peopleEyebrow:'DIE MENSCHEN HINTER CEYLON WELLNESS',peopleHeading:'Gute Planung hilft. Verantwortung übernehmen Menschen.',founderRole:'Gründer · Ceylon Wellness',founderDescription:'Gründer, Kundenkoordination und zentraler Ansprechpartner. Anfragen werden über WhatsApp betreut.',vipulaRole:'Wellness · Sri Lanka · Reiki',vipulaDescription:'Freigegebene Profilinformationen zu Wellness, Meditation, Spiritualität und Reiki.',meetVipula:'Dr. Vipula kennenlernen →',reikiRole:'Online-Reiki',reikiDescription:'Anfragen zu Online-Reiki mit vorliegenden Zertifikaten für Stufe Eins und Zwei.',exploreReiki:'Online-Reiki entdecken →',partnerEyebrow:'REISEORGANISATION IN SRI LANKA',partnerDescription:'Ein unabhängiger Partner vor Ort unterstützt die Reiseorganisation. Ceylon Wellness konzentriert sich auf Wellness-Reisen.',partnerLink:'Partner-Website besuchen',ctaEyebrow:'MENSCHLICH, WENN ES DARAUF ANKOMMT',ctaHeading:'Bereit, den Plan Wirklichkeit werden zu lassen?',ctaDescription:'Mit dem kostenlosen Guide gestalten Sie Ihre Idee. Unser Koordinator bestätigt Verfügbarkeit, Preise und nächste Schritte persönlich.',ctaButton:'Über WhatsApp sprechen',humanTitle:'Möchten Sie lieber mit einer Person sprechen?',humanDescription:'WhatsApp ist kostenlos und bei jedem Schritt verfügbar.',humanMessage:'Hallo Ceylon Wellness. Ich wünsche persönliche Hilfe bei der Planung meiner Sri-Lanka-Reise.'}});
Object.assign(copy.FR,{public:{brandTagline:'Votre voyage vers le bien-être commence au Sri Lanka',footerIntro:'Voyages bien-être personnalisés au Sri Lanka. La planification est gratuite ; les réservations, prix et disponibilités sont confirmés par une personne.',explore:'Découvrir',contact:'Contact',privacy:'Confidentialité',wellnessNotice:'Les informations sur le bien-être ne remplacent pas un avis médical.',whatsapp:'WhatsApp',introEyebrow:'LE BIEN-ÊTRE, SELON VOS ENVIES',guideEyebrow:'ASK CEYLON · GUIDE INTELLIGENT GRATUIT',chipNoApi:'Sans API',chipNoAccount:'Sans compte',chipLanguages:'5 langues',chipWhatsApp:'Relais par WhatsApp',journeyEyebrow:'LE SRI LANKA À VOTRE RYTHME',journeyHeading:'Choisissez une sensation, pas une liste de tâches.',teaCountry:'Région du thé',teaDescription:'Montagnes fraîches, paysages de thé et matinées paisibles.',oceanCoast:'Océan et littoral',oceanDescription:'Un espace pour respirer au bord de l’océan Indien.',natureWildlife:'Nature et faune',natureDescription:'Forêts, cascades et biodiversité remarquable.',cultureSpirit:'Culture et spiritualité',cultureDescription:'Traditions vivantes, réflexion et rencontres enrichissantes.',peopleEyebrow:'LES PERSONNES DE CEYLON WELLNESS',peopleHeading:'La planification aide. Les personnes prennent leurs responsabilités.',founderRole:'Fondateur · Ceylon Wellness',founderDescription:'Fondateur, coordination des voyageurs et interlocuteur principal. Les demandes sont suivies sur WhatsApp.',vipulaRole:'Bien-être · Sri Lanka · Reiki',vipulaDescription:'Contenu de profil autorisé autour du bien-être, de la méditation, de la spiritualité et du Reiki.',meetVipula:'Rencontrer le Dr Vipula →',reikiRole:'Reiki en ligne',reikiDescription:'Demandes de Reiki en ligne avec les justificatifs fournis pour les niveaux un et deux.',exploreReiki:'Découvrir le Reiki en ligne →',partnerEyebrow:'ORGANISATION DE VOYAGES AU SRI LANKA',partnerDescription:'Un partenaire indépendant au Sri Lanka aide à coordonner les voyages. Ceylon Wellness reste spécialisé dans les séjours bien-être.',partnerLink:'Visiter le site du partenaire',ctaEyebrow:'UNE PERSONNE, QUAND C’EST IMPORTANT',ctaHeading:'Prêt à concrétiser votre projet ?',ctaDescription:'Le guide gratuit vous aide à construire votre idée. Notre coordinateur confirmera personnellement les disponibilités, les prix et les prochaines étapes.',ctaButton:'Contacter sur WhatsApp',humanTitle:'Vous préférez parler à une personne ?',humanDescription:'WhatsApp reste gratuit et disponible à chaque étape.',humanMessage:'Bonjour Ceylon Wellness. Je souhaite être accompagné par une personne pour planifier mon voyage au Sri Lanka.'}});

const publicText=(language:Lang,key:string)=>{
  const value=copy[language].public?.[key];
  if(value)return value;
  console.warn(`Missing ${language} public translation for: ${key}`);
  return v4Labels[language].translationMissing;
};
Object.assign(copy.EN.public!,{simpleDescription:'This section is part of the growing Ceylon Wellness platform. We keep the experience simple, verified and human-centred.',simpleWellness:'Wellness, designed around you.',simpleSriLanka:'Sri Lanka, experienced with intention.',simpleAbout:'Founder-managed. Human-centred.',simpleNotFound:'Page not found'});
Object.assign(copy.PL.public!,{simpleDescription:'Ta sekcja jest częścią rozwijanej platformy Ceylon Wellness. Dbamy o prostotę, rzetelność i ludzkie podejście.',simpleWellness:'Wellness dopasowane do Ciebie.',simpleSriLanka:'Sri Lanka odkrywana świadomie.',simpleAbout:'Zarządzanie przez założyciela. Człowiek w centrum.',simpleNotFound:'Nie znaleziono strony'});
Object.assign(copy.RU.public!,{simpleDescription:'Этот раздел — часть развивающейся платформы Ceylon Wellness. Мы придерживаемся простоты, проверенной информации и человеческого подхода.',simpleWellness:'Wellness с учётом ваших пожеланий.',simpleSriLanka:'Шри-Ланка с осознанным подходом.',simpleAbout:'Под управлением основателя. В центре — человек.',simpleNotFound:'Страница не найдена'});
Object.assign(copy.DE.public!,{simpleDescription:'Dieser Bereich gehört zur wachsenden Ceylon-Wellness-Plattform. Wir setzen auf Einfachheit, geprüfte Informationen und persönliche Betreuung.',simpleWellness:'Wellness, auf Sie abgestimmt.',simpleSriLanka:'Sri Lanka bewusst erleben.',simpleAbout:'Vom Gründer geführt. Der Mensch im Mittelpunkt.',simpleNotFound:'Seite nicht gefunden'});
Object.assign(copy.FR.public!,{simpleDescription:'Cette rubrique fait partie de la plateforme Ceylon Wellness en développement. Nous privilégions la simplicité, les informations vérifiées et une approche humaine.',simpleWellness:'Le bien-être, selon vos envies.',simpleSriLanka:'Découvrir le Sri Lanka en pleine conscience.',simpleAbout:'Géré par son fondateur. L’humain au centre.',simpleNotFound:'Page introuvable'});
Object.assign(copy.EN.public!,{photoCredit:'Sri Lanka tea country · visual direction'});
Object.assign(copy.PL.public!,{photoCredit:'Herbaciane wyżyny Sri Lanki · kierunek wizualny'});
Object.assign(copy.RU.public!,{photoCredit:'Чайные высокогорья Шри-Ланки · визуальная концепция'});
Object.assign(copy.DE.public!,{photoCredit:'Sri Lankas Teeland · visuelle Gestaltung'});
Object.assign(copy.FR.public!,{photoCredit:'Région du thé au Sri Lanka · direction visuelle'});

const optionText:Record<Lang,Record<string,string>>={
 EN:{'3':'3 days','5':'5 days','7':'7 days','10':'10 days','14':'14+ days',Calm:'Calm',Renew:'Renew',Reconnect:'Reconnect',Reset:'Reset',Move:'Move',Reiki:'Reiki',Meditation:'Meditation',Ayurveda:'Ayurveda',Yoga:'Yoga',Nature:'Nature',Ocean:'Ocean',Tea:'Tea Country',Spirituality:'Spirituality',Wildlife:'Wildlife',Culture:'Culture',Relaxed:'Relaxed',Balanced:'Balanced','Explore More':'Explore more',Solo:'Solo',Couple:'Couple',Family:'Family',Friends:'Friends'},
 PL:{'3':'3 dni','5':'5 dni','7':'7 dni','10':'10 dni','14':'14+ dni',Calm:'Spokój',Renew:'Odnowa',Reconnect:'Ponowne połączenie',Reset:'Reset',Move:'Ruch',Reiki:'Reiki',Meditation:'Medytacja',Ayurveda:'Ajurweda',Yoga:'Joga',Nature:'Natura',Ocean:'Ocean',Tea:'Kraina herbaty',Spirituality:'Duchowość',Wildlife:'Dzika przyroda',Culture:'Kultura',Relaxed:'Spokojnie',Balanced:'Zrównoważenie','Explore More':'Więcej odkrywania',Solo:'Solo',Couple:'Para',Family:'Rodzina',Friends:'Przyjaciele'},
 RU:{'3':'3 дня','5':'5 дней','7':'7 дней','10':'10 дней','14':'14+ дней',Calm:'Спокойствие',Renew:'Обновление',Reconnect:'Перезагрузка связи с собой',Reset:'Перезагрузка',Move:'Движение',Reiki:'Рейки',Meditation:'Медитация',Ayurveda:'Аюрведа',Yoga:'Йога',Nature:'Природа',Ocean:'Океан',Tea:'Чайный край',Spirituality:'Духовность',Wildlife:'Дикая природа',Culture:'Культура',Relaxed:'Спокойный',Balanced:'Сбалансированный','Explore More':'Больше открытий',Solo:'Один/одна',Couple:'Пара',Family:'Семья',Friends:'Друзья'},
 DE:{'3':'3 Tage','5':'5 Tage','7':'7 Tage','10':'10 Tage','14':'14+ Tage',Calm:'Ruhe',Renew:'Erneuern',Reconnect:'Neu verbinden',Reset:'Reset',Move:'Bewegung',Reiki:'Reiki',Meditation:'Meditation',Ayurveda:'Ayurveda',Yoga:'Yoga',Nature:'Natur',Ocean:'Ozean',Tea:'Teeland',Spirituality:'Spiritualität',Wildlife:'Tierwelt',Culture:'Kultur',Relaxed:'Entspannt',Balanced:'Ausgewogen','Explore More':'Mehr entdecken',Solo:'Allein',Couple:'Paar',Family:'Familie',Friends:'Freunde'},
 FR:{'3':'3 jours','5':'5 jours','7':'7 jours','10':'10 jours','14':'14+ jours',Calm:'Calme',Renew:'Renouveau',Reconnect:'Reconnexion',Reset:'Réinitialiser',Move:'Bouger',Reiki:'Reiki',Meditation:'Méditation',Ayurveda:'Ayurveda',Yoga:'Yoga',Nature:'Nature',Ocean:'Océan',Tea:'Pays du thé',Spirituality:'Spiritualité',Wildlife:'Faune',Culture:'Culture',Relaxed:'Détendu',Balanced:'Équilibré','Explore More':'Explorer davantage',Solo:'Solo',Couple:'Couple',Family:'Famille',Friends:'Amis'}
};

function Shell({children,lang,setLang}:{children:React.ReactNode,lang:Lang,setLang:(l:Lang)=>void}){const [open,setOpen]=useState(false);const c=copy[lang];return <><header><Link className="brand" to="/"><span className="mark"><Leaf/></span><span>CEYLON WELLNESS<small>{publicText(lang,'brandTagline')}</small></span></Link><button className="menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav className={open?'open':''}>{[['/wellness',c.nav[0]],['/sri-lanka',c.nav[1]],['/dr-vipula',c.nav[2]],['/reiki',c.nav[3]],['/about',c.nav[4]]].map(([p,n])=><Link to={p} key={p}>{n}</Link>)}<label className="lang"><Languages/><select value={lang} onChange={e=>setLang(e.target.value as Lang)}>{LANGS.map(l=><option key={l}>{l}</option>)}</select></label><Link className="pill" to="/ask-ceylon"><Sparkles/> {c.ask}</Link></nav></header>{children}<footer><div><b>CEYLON WELLNESS</b><p>{publicText(lang,'footerIntro')}</p></div><div><b>{publicText(lang,'explore')}</b><Link to="/ask-ceylon">{c.ask}</Link><Link to="/reiki">{publicText(lang,'reikiRole')}</Link><Link to="/dr-vipula">Dr. Vipula</Link></div><div><b>{publicText(lang,'contact')}</b><a href={wa(c.public?.humanMessage||'Hello Ceylon Wellness.')} target="_blank">{publicText(lang,'whatsapp')} {PRIMARY.phone}</a><Link to="/privacy">{publicText(lang,'privacy')}</Link></div><small>© {new Date().getFullYear()} Ceylon Wellness · {publicText(lang,'wellnessNotice')}</small></footer><a className="waFloat" href={wa(c.public?.humanMessage||'Hello Ceylon Wellness.')} target="_blank"><MessageCircle/><span>{publicText(lang,'whatsapp')}</span></a></>}
const CTA=({lang}:{lang:Lang})=> <section className="cta"><div><span className="eyebrow">{publicText(lang,'ctaEyebrow')}</span><h2>{publicText(lang,'ctaHeading')}</h2><p>{publicText(lang,'ctaDescription')}</p></div><a className="button light" href={wa(copy[lang].public?.humanMessage||'Hello Ceylon Wellness.')} target="_blank">{publicText(lang,'ctaButton')} <ArrowRight/></a></section>;

const HERO_IMAGES=[
  '/images/hero/hero-01-wellness.png',
  '/images/hero/hero-02-ayurveda.png',
  '/images/hero/hero-03-reiki.png',
  '/images/hero/hero-04-wildlife.png',
  '/images/hero/hero-05-ocean.png'
] as const;

function Home({lang}:{lang:Lang}){
  const c=copy[lang];
  const [heroIndex,setHeroIndex]=useState(0);
  useEffect(()=>{
    if(typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer=window.setInterval(()=>setHeroIndex(i=>(i+1)%HERO_IMAGES.length),6500);
    return ()=>window.clearInterval(timer);
  },[]);
  const journeyCards=[['teaCountry','teaDescription'],['oceanCoast','oceanDescription'],['natureWildlife','natureDescription'],['cultureSpirit','cultureDescription']] as const;
  return <main>
    <section className="hero heroPhoto heroCinematic">
      <div className="heroSlides" aria-hidden="true">{HERO_IMAGES.map((src,i)=><div key={src} className={`heroSlide ${i===heroIndex?'active':''}`} style={{backgroundImage:`url(${src})`}}/>)}</div>
      <div className="heroShade" aria-hidden="true"/>
      <div className="heroText"><span className="eyebrow">CEYLON WELLNESS · SRI LANKA</span><h1>{c.hero}</h1><p>{c.sub}</p><div className="actions"><Link className="button" to="/ask-ceylon">{c.design} <ArrowRight/></Link><Link className="textLink" to="/ask-ceylon"><Sparkles/> {c.ask}</Link></div><div className="heroTrust"><span><ShieldCheck/> {c.free}</span><span><Languages/> EN · PL · RU · DE · FR</span></div></div>
      <div className="heroDots" aria-label="Hero images">{HERO_IMAGES.map((_,i)=><button key={i} type="button" className={i===heroIndex?'active':''} aria-label={`Show image ${i+1}`} aria-pressed={i===heroIndex} onClick={()=>setHeroIndex(i)}/>)}</div>
    </section>
    <section className="intro"><span className="eyebrow">{publicText(lang,'introEyebrow')}</span><h2>{c.feel}</h2><div className="feelings">{['Calm','Renew','Reconnect','Reset','Move'].map(x=><Link to="/ask-ceylon" key={x}>{optionText[lang][x]}<ArrowRight/></Link>)}</div></section>
    <section className="aiFeature"><div className="aiOrb"><Compass/></div><div><span className="eyebrow">{publicText(lang,'guideEyebrow')}</span><h2>{c.smart}</h2><p>{c.smartSub}</p><div className="aiChips"><span>{publicText(lang,'chipNoApi')}</span><span>{publicText(lang,'chipNoAccount')}</span><span>{publicText(lang,'chipLanguages')}</span><span>{publicText(lang,'chipWhatsApp')}</span></div><Link className="button" to="/ask-ceylon">{c.start} <ArrowRight/></Link></div></section>
    <section className="journeyPreview"><span className="eyebrow">{publicText(lang,'journeyEyebrow')}</span><h2>{publicText(lang,'journeyHeading')}</h2><div className="journeyTiles">{journeyCards.map(([title,description],i)=><article className={`journey j${i}`} key={title}><Compass/><h3>{publicText(lang,title)}</h3><p>{publicText(lang,description)}</p></article>)}</div></section>
    <section className="people"><span className="eyebrow">{publicText(lang,'peopleEyebrow')}</span><h2>{publicText(lang,'peopleHeading')}</h2><div className="cards"><article><div className="avatar">P</div><h3>Priyantha</h3><b>{publicText(lang,'founderRole')}</b><p>{publicText(lang,'founderDescription')}</p></article><article><div className="avatar">V</div><h3>Dr. Vipula Wanigasekera</h3><b>{publicText(lang,'vipulaRole')}</b><p>{publicText(lang,'vipulaDescription')}</p><Link to="/dr-vipula">{publicText(lang,'meetVipula')}</Link></article><article><div className="avatar">T</div><h3>Tatsiana</h3><b>{publicText(lang,'reikiRole')}</b><p>{publicText(lang,'reikiDescription')}</p><Link to="/reiki">{publicText(lang,'exploreReiki')}</Link></article></div></section>
    <section className="partner"><MapPin/><div><span className="eyebrow">{publicText(lang,'partnerEyebrow')}</span><h2>The BucketList Sri Lanka</h2><p>{publicText(lang,'partnerDescription')}</p><a className="textLink" href="https://thebucketlistsrilanka.com/" target="_blank">{publicText(lang,'partnerLink')} <ExternalLink/></a></div></section><CTA lang={lang}/>
  </main>;
}

const FEELS=['Calm','Renew','Reconnect','Reset','Move'];
const INTERESTS=['Reiki','Meditation','Ayurveda','Yoga','Nature','Ocean','Tea','Spirituality','Wildlife','Culture'];
const PACES=['Relaxed','Balanced','Explore More'];
const PARTIES=['Solo','Couple','Family','Friends'];
const STAYS=['Budget-friendly','Comfort / 3★','Premium / 4★','Luxury / 5★','Wellness / Ayurveda','Recommend for me'];
const TRANSPORT=['Airport pickup only','Private car + driver','Driver-guide','Selected transfers','Recommend for me'];
const BUDGETS=['Budget-friendly','Comfort','Premium','Luxury','Not sure yet'];
const AIRPORTS=['CMB · Colombo / Bandaranaike','Other / I will confirm later'];
const v4Labels:Record<Lang,Record<string,string>>={
 EN:{dates:'When are you travelling?',datesSub:'Add your dates and arrival details so our Sri Lanka team can plan airport pickup and a realistic first day.',flex:'My dates are flexible / not confirmed',arrival:'Arrival date',departure:'Departure date',airport:'Arrival airport',flight:'Flight number (optional)',landing:'Scheduled landing time',pickup:'Airport pickup',yes:'Yes, please',no:'No',later:'Not sure yet',travellers:'Who is travelling?',adults:'Adults',children:'Children',ages:'Children ages (optional)',wellness:'What should be at the heart of your journey?',stay:'What kind of stay feels right?',staySub:'We can design meaningful wellness travel at different comfort levels — wellness does not have to mean luxury.',transport:'How would you like to move around Sri Lanka?',budget:'What budget style should we plan around?',budgetSub:'We focus on value and your priorities. Exact prices come only after a human-planned itinerary.',pace:'What pace feels right?',final:'Your wellness-first Sri Lanka brief',nights:'nights',advance:'Booking & advance payments',advanceText:'Hotel and supplier advance rules vary. Your final quotation will clearly show whether each advance is refundable, partially refundable or non-refundable, plus any cancellation deadline.',invoice:'Final quotation & invoice',invoiceText:'After we plan the trip around your dates, wellness priorities and budget, a human confirms availability and sends the final quotation. Payment/invoice follows only after you approve the plan.',budgetFriendly:'Budget-friendly by design',budgetFriendlyText:'Tell us your comfort level. We balance wellness, travel time and value instead of pushing a fixed luxury package.',notes:'Anything else we should know? (optional)',result:'Your wellness-first Sri Lanka brief',send:'Send complete brief to WhatsApp'},
 PL:{dates:'Kiedy podróżujesz?',datesSub:'Dodaj daty i szczegóły przylotu, abyśmy mogli zaplanować odbiór z lotniska i realistyczny pierwszy dzień.',flex:'Moje daty są elastyczne / niepotwierdzone',arrival:'Data przylotu',departure:'Data wylotu',airport:'Lotnisko przylotu',flight:'Numer lotu (opcjonalnie)',landing:'Planowana godzina lądowania',pickup:'Odbiór z lotniska',yes:'Tak, proszę',no:'Nie',later:'Jeszcze nie wiem',travellers:'Kto podróżuje?',adults:'Dorośli',children:'Dzieci',ages:'Wiek dzieci (opcjonalnie)',wellness:'Co ma być sercem Twojej podróży?',stay:'Jaki standard pobytu Ci odpowiada?',staySub:'Tworzymy wartościowe podróże wellness w różnych budżetach — wellness nie musi oznaczać luksusu.',transport:'Jak chcesz podróżować po Sri Lance?',budget:'Jaki poziom budżetu mamy uwzględnić?',budgetSub:'Skupiamy się na wartości i Twoich priorytetach. Dokładna cena powstaje po ułożeniu planu przez człowieka.',pace:'Jakie tempo Ci odpowiada?',final:'Twój wellness plan Sri Lanki',nights:'nocy',advance:'Rezerwacje i zaliczki',advanceText:'Zasady zaliczek zależą od hotelu i dostawcy. Finalna oferta pokaże, czy zaliczka jest zwrotna, częściowo zwrotna lub bezzwrotna oraz termin anulowania.',invoice:'Finalna oferta i faktura',invoiceText:'Po ułożeniu podróży według dat, wellness i budżetu człowiek potwierdza dostępność i wysyła finalną ofertę. Płatność/faktura dopiero po akceptacji.',budgetFriendly:'Planowanie przyjazne dla budżetu',budgetFriendlyText:'Podaj swój poziom komfortu. Łączymy wellness, czas podróży i wartość zamiast narzucać luksusowy pakiet.',notes:'Co jeszcze powinniśmy wiedzieć? (opcjonalnie)',result:'Twój wellness plan Sri Lanki',send:'Wyślij pełny brief na WhatsApp'},
 RU:{dates:'Когда вы путешествуете?',datesSub:'Добавьте даты и данные прилёта, чтобы мы могли спланировать встречу в аэропорту и реалистичный первый день.',flex:'Даты гибкие / ещё не подтверждены',arrival:'Дата прилёта',departure:'Дата вылета',airport:'Аэропорт прилёта',flight:'Номер рейса (необязательно)',landing:'Время посадки',pickup:'Встреча в аэропорту',yes:'Да',no:'Нет',later:'Пока не знаю',travellers:'Кто путешествует?',adults:'Взрослые',children:'Дети',ages:'Возраст детей (необязательно)',wellness:'Что должно быть в центре путешествия?',stay:'Какой уровень проживания подходит?',staySub:'Мы создаём meaningful wellness-путешествия для разных бюджетов — wellness не обязан быть luxury.',transport:'Как вы хотите передвигаться по Шри-Ланке?',budget:'На какой бюджет ориентироваться?',budgetSub:'Мы ищем ценность и учитываем ваши приоритеты. Точная цена появляется после ручного планирования.',pace:'Какой темп подходит?',final:'Ваш wellness-план Шри-Ланки',nights:'ночей',advance:'Бронирование и авансы',advanceText:'Условия аванса зависят от отеля и поставщика. В финальном предложении будет ясно: возвратный, частично возвратный или невозвратный аванс и срок отмены.',invoice:'Финальное предложение и счёт',invoiceText:'После планирования по датам, wellness-целям и бюджету человек подтверждает наличие и отправляет финальное предложение. Оплата/счёт — после вашего одобрения.',budgetFriendly:'Планируем с учётом бюджета',budgetFriendlyText:'Вы выбираете уровень комфорта. Мы балансируем wellness, время в дороге и ценность, а не навязываем luxury-пакет.',notes:'Что ещё нам нужно знать? (необязательно)',result:'Ваш wellness-план Шри-Ланки',send:'Отправить полный запрос в WhatsApp'},
 DE:{dates:'Wann reisen Sie?',datesSub:'Fügen Sie Reisedaten und Ankunftsdetails hinzu, damit Flughafentransfer und erster Tag realistisch geplant werden.',flex:'Meine Daten sind flexibel / noch offen',arrival:'Ankunftsdatum',departure:'Abreisedatum',airport:'Ankunftsflughafen',flight:'Flugnummer (optional)',landing:'Geplante Landezeit',pickup:'Flughafenabholung',yes:'Ja, bitte',no:'Nein',later:'Noch unsicher',travellers:'Wer reist mit?',adults:'Erwachsene',children:'Kinder',ages:'Alter der Kinder (optional)',wellness:'Was soll im Mittelpunkt Ihrer Reise stehen?',stay:'Welche Unterkunft passt?',staySub:'Sinnvolle Wellness-Reisen sind in verschiedenen Budgets möglich — Wellness muss nicht Luxus bedeuten.',transport:'Wie möchten Sie Sri Lanka bereisen?',budget:'Mit welchem Budget-Stil sollen wir planen?',budgetSub:'Wir achten auf Wert und Prioritäten. Genaue Preise folgen erst nach persönlicher Reiseplanung.',pace:'Welches Tempo passt?',final:'Ihr Wellness-Reisebrief für Sri Lanka',nights:'Nächte',advance:'Buchung & Anzahlungen',advanceText:'Anzahlungsregeln unterscheiden sich je Hotel/Anbieter. Das finale Angebot zeigt klar: erstattbar, teilweise erstattbar oder nicht erstattbar sowie Stornofristen.',invoice:'Finales Angebot & Rechnung',invoiceText:'Nach Planung nach Daten, Wellness-Zielen und Budget bestätigt ein Mensch Verfügbarkeit und sendet das finale Angebot. Zahlung/Rechnung erst nach Ihrer Zustimmung.',budgetFriendly:'Budgetfreundlich geplant',budgetFriendlyText:'Sie wählen den Komfort. Wir balancieren Wellness, Reisezeit und Wert statt eines festen Luxuspakets.',notes:'Was sollten wir noch wissen? (optional)',result:'Ihr Wellness-Reisebrief für Sri Lanka',send:'Vollständigen Brief per WhatsApp senden'},
 FR:{dates:'Quand voyagez-vous ?',datesSub:'Ajoutez vos dates et votre arrivée pour organiser le transfert aéroport et une première journée réaliste.',flex:'Mes dates sont flexibles / non confirmées',arrival:'Date d’arrivée',departure:'Date de départ',airport:'Aéroport d’arrivée',flight:'Numéro de vol (facultatif)',landing:'Heure d’atterrissage prévue',pickup:'Transfert aéroport',yes:'Oui',no:'Non',later:'Pas encore sûr',travellers:'Qui voyage ?',adults:'Adultes',children:'Enfants',ages:'Âge des enfants (facultatif)',wellness:'Qu’est-ce qui doit être au cœur du voyage ?',stay:'Quel type de séjour vous convient ?',staySub:'Nous créons des voyages wellness significatifs à différents budgets — le wellness ne doit pas forcément être luxueux.',transport:'Comment souhaitez-vous vous déplacer au Sri Lanka ?',budget:'Quel niveau de budget devons-nous respecter ?',budgetSub:'Nous privilégions la valeur et vos priorités. Le prix exact vient après une planification humaine.',pace:'Quel rythme vous convient ?',final:'Votre brief wellness Sri Lanka',nights:'nuits',advance:'Réservation & acomptes',advanceText:'Les règles d’acompte varient selon l’hôtel/fournisseur. Le devis final indiquera clairement : remboursable, partiellement remboursable ou non remboursable, avec les délais d’annulation.',invoice:'Devis final & facture',invoiceText:'Après planification selon vos dates, priorités wellness et budget, une personne confirme les disponibilités et envoie le devis final. Paiement/facture seulement après votre accord.',budgetFriendly:'Conçu pour votre budget',budgetFriendlyText:'Choisissez votre niveau de confort. Nous équilibrons wellness, temps de trajet et valeur au lieu d’imposer un forfait luxe.',notes:'Autre chose à savoir ? (facultatif)',result:'Votre brief wellness Sri Lanka',send:'Envoyer le brief complet sur WhatsApp'}
};
Object.assign(v4Labels.EN,{plannerEyebrow:'ASK CEYLON · FREE WELLNESS JOURNEY PLANNER',step8Title:'Your editable day-by-day journey',draftHelper:'We create the first draft. You and the Ceylon Wellness team can refine it before any quotation or payment.',arrivalTitle:'Arrival & airport pickup',arrivalHelper:'These details help the driver/guide meet you correctly.',automatic:'automatically calculated',chooseFive:'Choose up to 5',flightPlaceholder:'e.g. UL 504 · or leave blank',agePlaceholder:'e.g. 5, 9',notesPlaceholder:'Dietary needs, mobility, special occasion, preferred places…',contactEyebrow:'V7 · TRAVELLER CONTACT',finalBuilderEyebrow:'V6 · FINAL JOURNEY BUILDER',workspaceHeading:'EDITABLE PLANNING WORKSPACE',draftDayHeading:'Day-by-day draft',routeHeading:'WELLNESS-FIRST RHYTHM',summaryHeading:'Traveller brief',arrivalSummary:'Arrival airport',flightTbc:'flight TBC',timeTbc:'time TBC',pickupTbc:'TBC',flexibleDates:'Flexible / not confirmed',quoteReadyTitle:'Quotation-ready, not auto-priced',quoteReadyBody:'The team checks real hotels, transport, wellness services and availability. Each supplier can have its own advance, refundable/partially refundable/non-refundable rule and cancellation deadline. Only then is the final quotation issued for approval before payment.',humanTitle:'Prefer a real person?',humanBody:'WhatsApp stays free and available at every step.',humanWaMessage:'Hello Ceylon Wellness. I prefer human help with my Sri Lanka journey.',translationMissing:'Translation to be confirmed',requestOpening:'Hello Ceylon Wellness. I completed the free Wellness Journey Planner.',messageLanguage:'Preferred language',messageContact:'CONTACT',messageToConfirm:'To confirm',messageEmailTbc:'email TBC',messagePhoneTbc:'phone TBC',messageDelivery:'PREFERRED DELIVERY',messageEmailWhatsApp:'Email + WhatsApp',messageWhatsAppOnly:'WhatsApp only',messageTravel:'TRAVEL',messageArrival:'Arrival airport',messageFlight:'Flight',messageLanding:'Landing time',messagePickup:'Airport pickup',messageTravellers:'TRAVELLERS',adultOne:'adult',adultPlural:'adults',childOne:'child',childPlural:'children',messageWellness:'WELLNESS GOAL',messageInterests:'INTERESTS',messageStay:'STAY',messageTransport:'TRANSPORT',messageBudget:'BUDGET STYLE',messagePace:'PACE',messageNotes:'NOTES',messageNone:'None',messageDraftPlan:'DRAFT DAY-BY-DAY PLAN',messageFinish:'Please optimise this wellness-first plan for my dates and budget. Please confirm real hotel and service availability, inclusions, supplier advance, refund and cancellation terms, and the final quotation before any payment.',routeSuggest:'We suggest',routeSeparator:' → '});
Object.assign(v4Labels.PL,{plannerEyebrow:'ASK CEYLON · BEZPŁATNY PLANER PODRÓŻY WELLNESS',step8Title:'Edytowalny plan podróży dzień po dniu',draftHelper:'Przygotowujemy pierwszy szkic. Możesz dopracować go z zespołem Ceylon Wellness przed wyceną lub płatnością.',arrivalTitle:'Przylot i odbiór z lotniska',arrivalHelper:'Te informacje pomogą kierowcy lub przewodnikowi Cię odnaleźć.',automatic:'obliczane automatycznie',chooseFive:'Wybierz maksymalnie 5',flightPlaceholder:'np. UL 504 · lub pozostaw puste',agePlaceholder:'np. 5, 9',notesPlaceholder:'Dieta, mobilność, wyjątkowa okazja, ulubione miejsca…',contactEyebrow:'V7 · KONTAKT PODRÓŻNEGO',finalBuilderEyebrow:'V6 · FINALNY PLAN PODRÓŻY',workspaceHeading:'EDYTOWALNY PLAN PODRÓŻY',draftDayHeading:'Szkic dzień po dniu',routeHeading:'RYTM PODRÓŻY WELLNESS',summaryHeading:'Informacje o podróży',arrivalSummary:'Lotnisko przylotu',flightTbc:'lot do potwierdzenia',timeTbc:'godzina do potwierdzenia',pickupTbc:'do ustalenia',flexibleDates:'Daty elastyczne / niepotwierdzone',quoteReadyTitle:'Gotowość do wyceny · bez automatycznej ceny',quoteReadyBody:'Zespół sprawdzi rzeczywiste hotele, transport, usługi wellness i dostępność. Każdy dostawca może mieć własne zasady zaliczki, zwrotu i anulowania. Przed płatnością otrzymasz finalną ofertę do akceptacji.',humanTitle:'Wolisz porozmawiać z człowiekiem?',humanBody:'WhatsApp jest bezpłatny i dostępny na każdym etapie.',humanWaMessage:'Dzień dobry Ceylon Wellness. Proszę o pomoc człowieka w zaplanowaniu podróży na Sri Lankę.',translationMissing:'Tłumaczenie do potwierdzenia',requestOpening:'Dzień dobry Ceylon Wellness. Wypełniam bezpłatny planer podróży wellness.',messageLanguage:'Preferowany język',messageContact:'KONTAKT',messageToConfirm:'Do potwierdzenia',messageEmailTbc:'e-mail do potwierdzenia',messagePhoneTbc:'telefon do potwierdzenia',messageDelivery:'PREFEROWANY KONTAKT',messageEmailWhatsApp:'E-mail + WhatsApp',messageWhatsAppOnly:'Tylko WhatsApp',messageTravel:'PODRÓŻ',messageArrival:'Lotnisko przylotu',messageFlight:'Lot',messageLanding:'Godzina lądowania',messagePickup:'Odbiór z lotniska',messageTravellers:'PODRÓŻUJĄCY',adultOne:'dorosły',adultPlural:'dorosłych',childOne:'dziecko',childPlural:'dzieci',messageWellness:'CEL WELLNESS',messageInterests:'ZAINTERESOWANIA',messageStay:'NOCLEG',messageTransport:'TRANSPORT',messageBudget:'STYL BUDŻETU',messagePace:'TEMPO',messageNotes:'UWAGI',messageNone:'Brak',messageDraftPlan:'SZKIC PLANU DZIEŃ PO DNIU',messageFinish:'Dopasuj proszę ten plan do moich dat i budżetu. Przed płatnością potwierdź rzeczywistą dostępność hoteli i usług, zakres świadczeń, zaliczki dostawców, warunki zwrotu i anulowania oraz ostateczną wycenę.',routeSuggest:'Proponujemy',routeSeparator:' → '});
Object.assign(v4Labels.RU,{plannerEyebrow:'ASK CEYLON · БЕСПЛАТНЫЙ ПЛАНИРОВЩИК WELLNESS-ПУТЕШЕСТВИЯ',step8Title:'Ваш редактируемый план поездки по дням',draftHelper:'Мы подготовим первый черновик. Вы сможете доработать его вместе с командой Ceylon Wellness до получения предложения или оплаты.',arrivalTitle:'Прилёт и встреча в аэропорту',arrivalHelper:'Эти данные помогут водителю или гиду встретить вас.',automatic:'рассчитывается автоматически',chooseFive:'Выберите не более 5',flightPlaceholder:'например, UL 504 · или оставьте пустым',agePlaceholder:'например, 5, 9',notesPlaceholder:'Питание, мобильность, особый повод, любимые места…',contactEyebrow:'V7 · КОНТАКТ ПУТЕШЕСТВЕННИКА',finalBuilderEyebrow:'V6 · ИТОГОВЫЙ ПЛАН ПОЕЗДКИ',workspaceHeading:'РЕДАКТИРУЕМЫЙ ПЛАНИРОВЩИК',draftDayHeading:'Черновой план по дням',routeHeading:'РИТМ WELLNESS-ПУТЕШЕСТВИЯ',summaryHeading:'Кратко о поездке',arrivalSummary:'Аэропорт прибытия',flightTbc:'рейс уточняется',timeTbc:'время уточняется',pickupTbc:'уточняется',flexibleDates:'Даты гибкие / не подтверждены',quoteReadyTitle:'Подготовка к предложению · без автоматического расчёта цены',quoteReadyBody:'Команда проверит реальные отели, транспорт, wellness-услуги и наличие мест. У каждого поставщика могут быть свои условия аванса, возврата и отмены. Итоговое предложение будет отправлено на согласование до оплаты.',humanTitle:'Предпочитаете поговорить с человеком?',humanBody:'WhatsApp бесплатен и доступен на каждом этапе.',humanWaMessage:'Здравствуйте, Ceylon Wellness. Мне нужна помощь специалиста в планировании поездки на Шри-Ланку.',translationMissing:'Перевод уточняется',requestOpening:'Здравствуйте, Ceylon Wellness. Я заполнил(а) бесплатный планировщик wellness-путешествия.',messageLanguage:'Предпочтительный язык',messageContact:'КОНТАКТЫ',messageToConfirm:'Уточняется',messageEmailTbc:'email уточняется',messagePhoneTbc:'телефон уточняется',messageDelivery:'ПРЕДПОЧТИТЕЛЬНЫЙ СПОСОБ СВЯЗИ',messageEmailWhatsApp:'Email + WhatsApp',messageWhatsAppOnly:'Только WhatsApp',messageTravel:'ПОЕЗДКА',messageArrival:'Аэропорт прибытия',messageFlight:'Рейс',messageLanding:'Время прилёта',messagePickup:'Встреча в аэропорту',messageTravellers:'ПУТЕШЕСТВУЮЩИЕ',adultOne:'взрослый',adultPlural:'взрослых',childOne:'ребёнок',childPlural:'детей',messageWellness:'ЦЕЛЬ WELLNESS',messageInterests:'ИНТЕРЕСЫ',messageStay:'ПРОЖИВАНИЕ',messageTransport:'ТРАНСПОРТ',messageBudget:'БЮДЖЕТ',messagePace:'ТЕМП',messageNotes:'ПРИМЕЧАНИЯ',messageNone:'Нет',messageDraftPlan:'ЧЕРНОВОЙ ПЛАН ПО ДНЯМ',messageFinish:'Пожалуйста, адаптируйте этот wellness-план к моим датам и бюджету. До оплаты подтвердите реальную доступность отелей и услуг, что включено, аванс поставщикам, условия возврата и отмены, а также итоговую стоимость.',routeSuggest:'Предлагаем',routeSeparator:' → '});
Object.assign(v4Labels.DE,{plannerEyebrow:'ASK CEYLON · KOSTENLOSER WELLNESS-REISEPLANER',step8Title:'Ihr bearbeitbarer Reiseplan Tag für Tag',draftHelper:'Wir erstellen den ersten Entwurf. Sie können ihn mit dem Ceylon-Wellness-Team vor einem Angebot oder einer Zahlung verfeinern.',arrivalTitle:'Ankunft und Abholung am Flughafen',arrivalHelper:'Diese Angaben helfen dem Fahrer oder Guide, Sie zu finden.',automatic:'automatisch berechnet',chooseFive:'Wählen Sie bis zu 5',flightPlaceholder:'z. B. UL 504 · oder leer lassen',agePlaceholder:'z. B. 5, 9',notesPlaceholder:'Ernährung, Mobilität, besonderer Anlass, Wunschorte…',contactEyebrow:'V7 · KONTAKT DER REISENDEN',finalBuilderEyebrow:'V6 · FINALER REISEPLAN',workspaceHeading:'BEARBEITUNGSBEREICH',draftDayHeading:'Entwurf Tag für Tag',routeHeading:'WELLNESS-REISERHYTHMUS',summaryHeading:'Ihre Reiseangaben',arrivalSummary:'Ankunftsflughafen',flightTbc:'Flug noch offen',timeTbc:'Zeit noch offen',pickupTbc:'noch offen',flexibleDates:'Flexibel / noch nicht bestätigt',quoteReadyTitle:'Angebotsbereit · ohne automatische Preisberechnung',quoteReadyBody:'Das Team prüft reale Hotels, Transport, Wellness-Angebote und Verfügbarkeit. Für jeden Anbieter können eigene Anzahlungs-, Erstattungs- und Stornobedingungen gelten. Das endgültige Angebot wird vor der Zahlung zur Freigabe vorgelegt.',humanTitle:'Möchten Sie lieber mit einer Person sprechen?',humanBody:'WhatsApp ist kostenlos und bei jedem Schritt verfügbar.',humanWaMessage:'Hallo Ceylon Wellness. Ich wünsche persönliche Hilfe bei der Planung meiner Sri-Lanka-Reise.',translationMissing:'Übersetzung wird geprüft',requestOpening:'Hallo Ceylon Wellness. Ich habe den kostenlosen Wellness-Reiseplaner ausgefüllt.',messageLanguage:'Bevorzugte Sprache',messageContact:'KONTAKT',messageToConfirm:'Noch zu bestätigen',messageEmailTbc:'E-Mail noch offen',messagePhoneTbc:'Telefon noch offen',messageDelivery:'BEVORZUGTER KONTAKT',messageEmailWhatsApp:'E-Mail + WhatsApp',messageWhatsAppOnly:'Nur WhatsApp',messageTravel:'REISE',messageArrival:'Ankunftsflughafen',messageFlight:'Flug',messageLanding:'Ankunftszeit',messagePickup:'Abholung am Flughafen',messageTravellers:'REISENDE',adultOne:'Erwachsene Person',adultPlural:'Erwachsene',childOne:'Kind',childPlural:'Kinder',messageWellness:'WELLNESS-ZIEL',messageInterests:'INTERESSEN',messageStay:'UNTERKUNFT',messageTransport:'TRANSPORT',messageBudget:'BUDGETSTIL',messagePace:'REISETEMPO',messageNotes:'HINWEISE',messageNone:'Keine',messageDraftPlan:'REISEENTWURF TAG FÜR TAG',messageFinish:'Bitte passen Sie diesen Wellness-Reiseplan an meine Reisedaten und mein Budget an. Bestätigen Sie vor einer Zahlung die tatsächliche Verfügbarkeit von Hotels und Leistungen, die Inklusivleistungen, Lieferantenanzahlungen, Erstattungs- und Stornobedingungen sowie den endgültigen Preis.',routeSuggest:'Wir empfehlen',routeSeparator:' → '});
Object.assign(v4Labels.FR,{plannerEyebrow:'ASK CEYLON · PLANIFICATEUR DE VOYAGE BIEN-ÊTRE GRATUIT',step8Title:'Votre itinéraire modifiable jour par jour',draftHelper:'Nous préparons une première ébauche. Vous pourrez l’affiner avec l’équipe Ceylon Wellness avant tout devis ou paiement.',arrivalTitle:'Arrivée et accueil à l’aéroport',arrivalHelper:'Ces informations aideront le chauffeur ou le guide à vous retrouver.',automatic:'calculé automatiquement',chooseFive:'Choisissez jusqu’à 5 options',flightPlaceholder:'p. ex. UL 504 · ou laissez vide',agePlaceholder:'p. ex. 5, 9',notesPlaceholder:'Régime alimentaire, mobilité, occasion spéciale, lieux préférés…',contactEyebrow:'V7 · COORDONNÉES DU VOYAGEUR',finalBuilderEyebrow:'V6 · ITINÉRAIRE FINAL',workspaceHeading:'ESPACE DE PLANIFICATION MODIFIABLE',draftDayHeading:'Ébauche jour par jour',routeHeading:'RYTHME DU VOYAGE BIEN-ÊTRE',summaryHeading:'Votre voyage en bref',arrivalSummary:'Aéroport d’arrivée',flightTbc:'vol à confirmer',timeTbc:'heure à confirmer',pickupTbc:'à confirmer',flexibleDates:'Dates flexibles / non confirmées',quoteReadyTitle:'Prêt pour un devis · sans prix automatique',quoteReadyBody:'L’équipe vérifiera les hôtels, transports, services bien-être et disponibilités réels. Chaque fournisseur peut appliquer ses propres règles d’acompte, de remboursement et d’annulation. Le devis final sera soumis à votre approbation avant tout paiement.',humanTitle:'Vous préférez parler à une personne ?',humanBody:'WhatsApp reste gratuit et disponible à chaque étape.',humanWaMessage:'Bonjour Ceylon Wellness. Je souhaite être accompagné par une personne pour planifier mon voyage au Sri Lanka.',translationMissing:'Traduction à confirmer',requestOpening:'Bonjour Ceylon Wellness. J’ai rempli le planificateur gratuit de voyage bien-être.',messageLanguage:'Langue préférée',messageContact:'CONTACT',messageToConfirm:'À confirmer',messageEmailTbc:'e-mail à confirmer',messagePhoneTbc:'téléphone à confirmer',messageDelivery:'MODE DE CONTACT PRÉFÉRÉ',messageEmailWhatsApp:'E-mail + WhatsApp',messageWhatsAppOnly:'WhatsApp uniquement',messageTravel:'VOYAGE',messageArrival:'Aéroport d’arrivée',messageFlight:'Vol',messageLanding:'Heure d’arrivée',messagePickup:'Accueil à l’aéroport',messageTravellers:'VOYAGEURS',adultOne:'adulte',adultPlural:'adultes',childOne:'enfant',childPlural:'enfants',messageWellness:'OBJECTIF BIEN-ÊTRE',messageInterests:'CENTRES D’INTÉRÊT',messageStay:'HÉBERGEMENT',messageTransport:'TRANSPORT',messageBudget:'STYLE DE BUDGET',messagePace:'RYTHME',messageNotes:'REMARQUES',messageNone:'Aucune',messageDraftPlan:'ÉBAUCHE DE L’ITINÉRAIRE JOUR PAR JOUR',messageFinish:'Veuillez adapter cet itinéraire axé sur le bien-être à mes dates et à mon budget. Avant tout paiement, merci de confirmer les disponibilités réelles des hôtels et services, les prestations incluses, les acomptes fournisseurs, les conditions de remboursement et d’annulation, ainsi que le devis final.',routeSuggest:'Nous proposons',routeSeparator:' → '});
Object.assign(optionText.EN,{'Budget-friendly':'Budget-friendly','Comfort / 3★':'Comfort / 3★','Premium / 4★':'Premium / 4★','Luxury / 5★':'Luxury / 5★','Wellness / Ayurveda':'Wellness / Ayurveda','Recommend for me':'Recommend for me','Airport pickup only':'Airport pickup only','Private car + driver':'Private car + driver','Driver-guide':'Driver-guide','Selected transfers':'Selected transfers','Comfort':'Comfort','Premium':'Premium','Luxury':'Luxury','Not sure yet':'Not sure yet','CMB · Colombo / Bandaranaike':'CMB · Colombo / Bandaranaike','Other / I will confirm later':'Other / I will confirm later','a gentle wellness base with time for reflection':'a gentle wellness base with time for reflection','Sri Lanka’s green hill country and tea landscapes':'Sri Lanka’s green hill country and tea landscapes','a carefully paced nature or wildlife experience':'a carefully paced nature or wildlife experience','a meaningful cultural stop':'a meaningful cultural stop','a restorative finish by the Indian Ocean':'a restorative finish by the Indian Ocean','a balanced mix of nature, culture and unhurried rest':'a balanced mix of nature, culture and unhurried rest','fewer bases and more breathing room':'fewer bases and more breathing room','more variety while keeping travel times sensible':'more variety while keeping travel times sensible','a balanced mix of discovery and rest':'a balanced mix of discovery and rest','Keep the first day light after the flight.':'Keep the first day light after the flight.','Arrive · settle · breathe':'Arrive · settle · breathe','Culture + mindful discovery':'Culture + mindful discovery','A carefully paced heritage experience with time to rest':'A carefully paced heritage experience with time to rest','Comfort/value stay':'Comfort/value stay','Wellness base':'Wellness base','Restore':'Restore','Wellness consultation / gentle practice / free time':'Wellness consultation / gentle practice / free time','Slow morning, optional Reiki/Ayurveda/yoga and personal time':'Slow morning, optional Reiki/Ayurveda/yoga and personal time','Wellness / Ayurveda stay':'Wellness / Ayurveda stay','Final services are selected and confirmed by the team.':'Final services are selected and confirmed by the team.','Nature + tea country':'Nature + tea country','Scenic transfer, green landscapes and a slower hill-country afternoon':'Scenic transfer, green landscapes and a slower hill-country afternoon','Value hill-country stay':'Value hill-country stay','Slow exploration':'Slow exploration','Tea landscape, nature walk or restful free time':'Tea landscape, nature walk or restful free time','Same stay':'Same stay','Fewer hotel changes can reduce cost and travel fatigue.':'Fewer hotel changes can reduce cost and travel fatigue.','Nature / wildlife region':'Nature / wildlife region','Nature + wildlife':'Nature + wildlife','A responsibly paced wildlife or nature experience':'A responsibly paced wildlife or nature experience','Value nature stay':'Value nature stay','Exact park/experience depends on route, season and availability.':'Exact park/experience depends on route, season and availability.','South / West Coast':'South / West Coast','Ocean reset':'Ocean reset','Coastal transfer, beach time and a restorative evening':'Coastal transfer, beach time and a restorative evening','Beach stay':'Beach stay','Colombo / airport area':'Colombo / airport area','Best-fit base':'Best-fit base','Prepare for departure':'Prepare for departure','Discover + recover':'Discover + recover','Rest + wellbeing':'Rest + wellbeing','Easy final day, transfer planning and departure readiness':'Easy final day, transfer planning and departure readiness','Flexible day for wellness, local discovery or rest':'Flexible day for wellness, local discovery or rest','Best-value confirmed stay':'Best-value confirmed stay','Departure timing will be matched to the confirmed flight.':'Departure timing will be matched to the confirmed flight.','Kept flexible so the human planner can optimise route, budget and availability.':'Kept flexible so the human planner can optimise route, budget and availability.','Arrival-area stay':'Arrival-area stay','Airport pickup, gentle arrival and an unhurried evening':'Airport pickup, gentle arrival and an unhurried evening','Cultural Triangle':'Cultural Triangle','Kandy / Hill Country':'Kandy / Hill Country','Hill Country':'Hill Country'});
Object.assign(optionText.EN,{'Negombo / Colombo area':'Negombo / Colombo area'});
Object.assign(optionText.PL,{'Budget-friendly':'Przyjazny dla budżetu','Comfort / 3★':'Komfort / 3★','Premium / 4★':'Premium / 4★','Luxury / 5★':'Luksus / 5★','Wellness / Ayurveda':'Wellness / ajurweda','Recommend for me':'Poleć mi','Airport pickup only':'Tylko odbiór z lotniska','Private car + driver':'Prywatny samochód z kierowcą','Driver-guide':'Kierowca-przewodnik','Selected transfers':'Wybrane transfery','Comfort':'Komfort','Premium':'Premium','Luxury':'Luksus','Not sure yet':'Jeszcze nie wiem','CMB · Colombo / Bandaranaike':'CMB · Colombo / Bandaranaike','Other / I will confirm later':'Inne / potwierdzę później','a gentle wellness base with time for reflection':'spokojna baza wellness i czas na refleksję','Sri Lanka’s green hill country and tea landscapes':'zielone wyżyny Sri Lanki i herbaciane krajobrazy','a carefully paced nature or wildlife experience':'spokojne spotkanie z naturą lub dziką przyrodą','a meaningful cultural stop':'wartościowy przystanek kulturowy','a restorative finish by the Indian Ocean':'regenerujący wypoczynek nad Oceanem Indyjskim','a balanced mix of nature, culture and unhurried rest':'równowaga natury, kultury i niespiesznego odpoczynku','fewer bases and more breathing room':'mniej noclegów i więcej czasu na odpoczynek','more variety while keeping travel times sensible':'więcej różnorodności przy rozsądnym czasie przejazdów','a balanced mix of discovery and rest':'równowaga odkrywania i odpoczynku','Keep the first day light after the flight.':'Po locie zaplanuj spokojny pierwszy dzień.','Arrive · settle · breathe':'Przyjazd · odpoczynek · oddech','Culture + mindful discovery':'Kultura i uważne odkrywanie','A carefully paced heritage experience with time to rest':'Spokojne poznawanie dziedzictwa z czasem na odpoczynek','Comfort/value stay':'Komfortowy, korzystny cenowo nocleg','Wellness base':'Baza wellness','Restore':'Regeneracja','Wellness consultation / gentle practice / free time':'Konsultacja wellness / łagodna praktyka / czas wolny','Slow morning, optional Reiki/Ayurveda/yoga and personal time':'Spokojny poranek, opcjonalne Reiki, ajurweda lub joga i czas dla siebie','Wellness / Ayurveda stay':'Nocleg wellness / ajurweda','Final services are selected and confirmed by the team.':'Zespół wybierze i potwierdzi usługi końcowe.','Nature + tea country':'Natura i kraina herbaty','Scenic transfer, green landscapes and a slower hill-country afternoon':'Malowniczy przejazd, zielone krajobrazy i spokojne popołudnie na wyżynie','Value hill-country stay':'Korzystny cenowo nocleg na wyżynie','Slow exploration':'Spokojne odkrywanie','Tea landscape, nature walk or restful free time':'Herbaciane krajobrazy, spacer na łonie natury lub odpoczynek','Same stay':'Ten sam nocleg','Fewer hotel changes can reduce cost and travel fatigue.':'Mniej zmian hoteli może obniżyć koszty i zmęczenie podróżą.','Nature / wildlife region':'Region przyrodniczy','Nature + wildlife':'Natura i dzika przyroda','A responsibly paced wildlife or nature experience':'Spotkanie z naturą lub dziką przyrodą w spokojnym tempie','Value nature stay':'Korzystny cenowo nocleg blisko natury','Exact park/experience depends on route, season and availability.':'Wybór parku i atrakcji zależy od trasy, sezonu i dostępności.','South / West Coast':'Południowe / zachodnie wybrzeże','Ocean reset':'Regeneracja nad oceanem','Coastal transfer, beach time and a restorative evening':'Przejazd na wybrzeże, czas na plaży i regenerujący wieczór','Beach stay':'Nocleg przy plaży','Colombo / airport area':'Colombo / okolice lotniska','Best-fit base':'Najlepiej dopasowana baza','Prepare for departure':'Przygotowanie do wylotu','Discover + recover':'Odkrywanie i odpoczynek','Rest + wellbeing':'Odpoczynek i dobre samopoczucie','Easy final day, transfer planning and departure readiness':'Spokojny ostatni dzień, plan transferu i przygotowanie do wylotu','Flexible day for wellness, local discovery or rest':'Elastyczny dzień na wellness, lokalne odkrywanie lub odpoczynek','Best-value confirmed stay':'Potwierdzony nocleg o najlepszej wartości','Departure timing will be matched to the confirmed flight.':'Godzina wyjazdu zostanie dopasowana do potwierdzonego lotu.','Kept flexible so the human planner can optimise route, budget and availability.':'Pozostawiamy elastyczność, aby koordynator dopasował trasę, budżet i dostępność.','Arrival-area stay':'Nocleg w pobliżu lotniska','Airport pickup, gentle arrival and an unhurried evening':'Odbiór z lotniska, spokojny przyjazd i niespieszny wieczór','Cultural Triangle':'Trójkąt Kulturowy','Kandy / Hill Country':'Kandy / wyżyna herbaciana','Hill Country':'Wyżyna'});
Object.assign(optionText.PL,{'Negombo / Colombo area':'Negombo / okolice Colombo'});
Object.assign(optionText.RU,{'Budget-friendly':'Экономичный','Comfort / 3★':'Комфорт / 3★','Premium / 4★':'Премиум / 4★','Luxury / 5★':'Люкс / 5★','Wellness / Ayurveda':'Wellness / аюрведа','Recommend for me':'Посоветуйте вариант','Airport pickup only':'Только встреча в аэропорту','Private car + driver':'Частный автомобиль с водителем','Driver-guide':'Водитель-гид','Selected transfers':'Отдельные трансферы','Comfort':'Комфорт','Premium':'Премиум','Luxury':'Люкс','Not sure yet':'Пока не знаю','CMB · Colombo / Bandaranaike':'CMB · Colombo / Bandaranaike','Other / I will confirm later':'Другой / сообщу позже','a gentle wellness base with time for reflection':'спокойная wellness-база и время для размышлений','Sri Lanka’s green hill country and tea landscapes':'зелёные высокогорья Шри-Ланки и чайные пейзажи','a carefully paced nature or wildlife experience':'неторопливое знакомство с природой или животным миром','a meaningful cultural stop':'содержательная культурная остановка','a restorative finish by the Indian Ocean':'восстановительный отдых у Индийского океана','a balanced mix of nature, culture and unhurried rest':'гармоничное сочетание природы, культуры и спокойного отдыха','fewer bases and more breathing room':'меньше переездов и больше времени для отдыха','more variety while keeping travel times sensible':'больше разнообразия при разумном времени в пути','a balanced mix of discovery and rest':'сочетание новых впечатлений и отдыха','Keep the first day light after the flight.':'После перелёта первый день будет спокойным.','Arrive · settle · breathe':'Прилёт · отдых · спокойствие','Culture + mindful discovery':'Культура и осознанные открытия','A carefully paced heritage experience with time to rest':'Знакомство с наследием в спокойном темпе и время для отдыха','Comfort/value stay':'Комфортное проживание с хорошим соотношением цены и качества','Wellness base':'Wellness-база','Restore':'Восстановление','Wellness consultation / gentle practice / free time':'Консультация wellness / мягкая практика / свободное время','Slow morning, optional Reiki/Ayurveda/yoga and personal time':'Спокойное утро, по желанию Reiki, аюрведа или йога и личное время','Wellness / Ayurveda stay':'Проживание wellness / аюрведа','Final services are selected and confirmed by the team.':'Итоговые услуги выберет и подтвердит команда.','Nature + tea country':'Природа и чайный край','Scenic transfer, green landscapes and a slower hill-country afternoon':'Живописная дорога, зелёные пейзажи и спокойный день в высокогорье','Value hill-country stay':'Доступное проживание в высокогорье','Slow exploration':'Неспешное знакомство','Tea landscape, nature walk or restful free time':'Чайные пейзажи, прогулка на природе или отдых','Same stay':'То же место проживания','Fewer hotel changes can reduce cost and travel fatigue.':'Меньше смен отелей помогает снизить стоимость и усталость.','Nature / wildlife region':'Природный регион','Nature + wildlife':'Природа и животный мир','A responsibly paced wildlife or nature experience':'Знакомство с природой или животным миром в комфортном темпе','Value nature stay':'Доступное проживание на природе','Exact park/experience depends on route, season and availability.':'Выбор парка и программы зависит от маршрута, сезона и наличия мест.','South / West Coast':'Южное / западное побережье','Ocean reset':'Отдых у океана','Coastal transfer, beach time and a restorative evening':'Переезд к побережью, время на пляже и спокойный вечер','Beach stay':'Проживание у пляжа','Colombo / airport area':'Colombo / район аэропорта','Best-fit base':'Подходящая база','Prepare for departure':'Подготовка к отъезду','Discover + recover':'Открытия и отдых','Rest + wellbeing':'Отдых и хорошее самочувствие','Easy final day, transfer planning and departure readiness':'Спокойный последний день, планирование трансфера и подготовка к вылету','Flexible day for wellness, local discovery or rest':'Гибкий день для wellness, местных впечатлений или отдыха','Best-value confirmed stay':'Подтверждённое проживание с лучшим соотношением цены и качества','Departure timing will be matched to the confirmed flight.':'Время выезда согласуют с подтверждённым рейсом.','Kept flexible so the human planner can optimise route, budget and availability.':'Гибкий план позволит координатору оптимизировать маршрут, бюджет и доступность.','Arrival-area stay':'Проживание рядом с аэропортом','Airport pickup, gentle arrival and an unhurried evening':'Встреча в аэропорту, спокойное прибытие и неспешный вечер','Cultural Triangle':'Культурный треугольник','Kandy / Hill Country':'Kandy / высокогорье','Hill Country':'Высокогорье'});
Object.assign(optionText.RU,{'Negombo / Colombo area':'Negombo / окрестности Colombo'});
Object.assign(optionText.DE,{'Budget-friendly':'Preisbewusst','Comfort / 3★':'Komfort / 3★','Premium / 4★':'Premium / 4★','Luxury / 5★':'Luxus / 5★','Wellness / Ayurveda':'Wellness / Ayurveda','Recommend for me':'Bitte empfehlen','Airport pickup only':'Nur Abholung am Flughafen','Private car + driver':'Privatwagen mit Fahrer','Driver-guide':'Fahrer und Guide','Selected transfers':'Ausgewählte Transfers','Comfort':'Komfort','Premium':'Premium','Luxury':'Luxus','Not sure yet':'Noch unsicher','CMB · Colombo / Bandaranaike':'CMB · Colombo / Bandaranaike','Other / I will confirm later':'Andere / bestätige ich später','a gentle wellness base with time for reflection':'eine ruhige Wellness-Basis mit Zeit zur Besinnung','Sri Lanka’s green hill country and tea landscapes':'Sri Lankas grünes Hochland und Teelandschaften','a carefully paced nature or wildlife experience':'ein Natur- oder Wildtiererlebnis in ruhigem Tempo','a meaningful cultural stop':'ein bedeutungsvoller Kulturstopp','a restorative finish by the Indian Ocean':'ein erholsamer Abschluss am Indischen Ozean','a balanced mix of nature, culture and unhurried rest':'eine ausgewogene Mischung aus Natur, Kultur und erholsamer Ruhe','fewer bases and more breathing room':'weniger Zwischenstopps und mehr Zeit zum Durchatmen','more variety while keeping travel times sensible':'mehr Abwechslung bei angemessenen Fahrzeiten','a balanced mix of discovery and rest':'eine ausgewogene Mischung aus Entdecken und Erholen','Keep the first day light after the flight.':'Der erste Tag bleibt nach dem Flug entspannt.','Arrive · settle · breathe':'Ankommen · ausruhen · durchatmen','Culture + mindful discovery':'Kultur und bewusstes Entdecken','A carefully paced heritage experience with time to rest':'Ein Kulturerlebnis in ruhigem Tempo mit Zeit zum Ausruhen','Comfort/value stay':'Komfortable Unterkunft mit gutem Preis-Leistungs-Verhältnis','Wellness base':'Wellness-Basis','Restore':'Erholen','Wellness consultation / gentle practice / free time':'Wellness-Beratung / sanfte Praxis / freie Zeit','Slow morning, optional Reiki/Ayurveda/yoga and personal time':'Ruhiger Morgen, optional Reiki, Ayurveda oder Yoga und Zeit für sich','Wellness / Ayurveda stay':'Wellness- / Ayurveda-Unterkunft','Final services are selected and confirmed by the team.':'Die endgültigen Leistungen werden vom Team ausgewählt und bestätigt.','Nature + tea country':'Natur und Teeland','Scenic transfer, green landscapes and a slower hill-country afternoon':'Malerische Fahrt, grüne Landschaften und ein ruhiger Nachmittag im Hochland','Value hill-country stay':'Preisbewusste Unterkunft im Hochland','Slow exploration':'Ruhiges Entdecken','Tea landscape, nature walk or restful free time':'Teelandschaft, Spaziergang in der Natur oder freie Erholungszeit','Same stay':'Gleiche Unterkunft','Fewer hotel changes can reduce cost and travel fatigue.':'Weniger Hotelwechsel können Kosten und Reisemüdigkeit verringern.','Nature / wildlife region':'Naturregion','Nature + wildlife':'Natur und Tierwelt','A responsibly paced wildlife or nature experience':'Ein Natur- oder Wildtiererlebnis in verantwortungsvollem Tempo','Value nature stay':'Preisbewusste Unterkunft in der Natur','Exact park/experience depends on route, season and availability.':'Der konkrete Park und das Erlebnis hängen von Route, Saison und Verfügbarkeit ab.','South / West Coast':'Süd- / Westküste','Ocean reset':'Erholung am Meer','Coastal transfer, beach time and a restorative evening':'Fahrt an die Küste, Zeit am Strand und ein erholsamer Abend','Beach stay':'Unterkunft am Strand','Colombo / airport area':'Colombo / Flughafengebiet','Best-fit base':'Passende Basis','Prepare for departure':'Abreise vorbereiten','Discover + recover':'Entdecken und erholen','Rest + wellbeing':'Ruhe und Wohlbefinden','Easy final day, transfer planning and departure readiness':'Entspannter letzter Tag, Transferplanung und Vorbereitung auf die Abreise','Flexible day for wellness, local discovery or rest':'Flexibler Tag für Wellness, lokale Entdeckungen oder Erholung','Best-value confirmed stay':'Bestätigte Unterkunft mit gutem Preis-Leistungs-Verhältnis','Departure timing will be matched to the confirmed flight.':'Die Abfahrtszeit wird auf den bestätigten Flug abgestimmt.','Kept flexible so the human planner can optimise route, budget and availability.':'Der flexible Plan ermöglicht die Optimierung von Route, Budget und Verfügbarkeit durch das Team.','Arrival-area stay':'Unterkunft nahe dem Ankunftsflughafen','Airport pickup, gentle arrival and an unhurried evening':'Abholung am Flughafen, entspanntes Ankommen und ein ruhiger Abend','Cultural Triangle':'Kulturdreieck','Kandy / Hill Country':'Kandy / Hochland','Hill Country':'Hochland'});
Object.assign(optionText.DE,{'Negombo / Colombo area':'Negombo / Umgebung Colombo'});
Object.assign(optionText.FR,{'Budget-friendly':'Économique','Comfort / 3★':'Confort / 3★','Premium / 4★':'Premium / 4★','Luxury / 5★':'Luxe / 5★','Wellness / Ayurveda':'Bien-être / Ayurveda','Recommend for me':'Recommandez-moi une option','Airport pickup only':'Accueil à l’aéroport uniquement','Private car + driver':'Voiture privée avec chauffeur','Driver-guide':'Chauffeur-guide','Selected transfers':'Transferts sélectionnés','Comfort':'Confort','Premium':'Premium','Luxury':'Luxe','Not sure yet':'Je ne sais pas encore','CMB · Colombo / Bandaranaike':'CMB · Colombo / Bandaranaike','Other / I will confirm later':'Autre / je confirmerai plus tard','a gentle wellness base with time for reflection':'un lieu de bien-être paisible avec du temps pour se ressourcer','Sri Lanka’s green hill country and tea landscapes':'les hautes terres verdoyantes et les paysages de thé du Sri Lanka','a carefully paced nature or wildlife experience':'une découverte de la nature ou de la faune à un rythme doux','a meaningful cultural stop':'une étape culturelle enrichissante','a restorative finish by the Indian Ocean':'une fin de séjour ressourçante au bord de l’océan Indien','a balanced mix of nature, culture and unhurried rest':'un équilibre entre nature, culture et repos sans précipitation','fewer bases and more breathing room':'moins d’étapes et davantage de temps pour souffler','more variety while keeping travel times sensible':'plus de diversité avec des trajets raisonnables','a balanced mix of discovery and rest':'un équilibre entre découvertes et repos','Keep the first day light after the flight.':'La première journée reste légère après le vol.','Arrive · settle · breathe':'Arrivée · installation · respiration','Culture + mindful discovery':'Culture et découverte en conscience','A carefully paced heritage experience with time to rest':'Une découverte du patrimoine à un rythme doux, avec du temps pour se reposer','Comfort/value stay':'Hébergement confortable au bon rapport qualité-prix','Wellness base':'Lieu de séjour bien-être','Restore':'Se ressourcer','Wellness consultation / gentle practice / free time':'Consultation bien-être / pratique douce / temps libre','Slow morning, optional Reiki/Ayurveda/yoga and personal time':'Matinée calme, Reiki, Ayurveda ou yoga en option et temps personnel','Wellness / Ayurveda stay':'Séjour bien-être / Ayurveda','Final services are selected and confirmed by the team.':'Les services définitifs seront choisis et confirmés par l’équipe.','Nature + tea country':'Nature et région du thé','Scenic transfer, green landscapes and a slower hill-country afternoon':'Trajet panoramique, paysages verdoyants et après-midi tranquille dans les hauteurs','Value hill-country stay':'Hébergement abordable dans les hauteurs','Slow exploration':'Découverte tranquille','Tea landscape, nature walk or restful free time':'Paysages de thé, promenade dans la nature ou temps libre','Same stay':'Même hébergement','Fewer hotel changes can reduce cost and travel fatigue.':'Moins de changements d’hôtel peuvent réduire les coûts et la fatigue.','Nature / wildlife region':'Région naturelle','Nature + wildlife':'Nature et faune','A responsibly paced wildlife or nature experience':'Découverte de la nature ou de la faune à un rythme respectueux','Value nature stay':'Hébergement abordable au cœur de la nature','Exact park/experience depends on route, season and availability.':'Le parc et l’expérience dépendront de l’itinéraire, de la saison et des disponibilités.','South / West Coast':'Côte sud / ouest','Ocean reset':'Parenthèse au bord de l’océan','Coastal transfer, beach time and a restorative evening':'Trajet vers la côte, moment à la plage et soirée ressourçante','Beach stay':'Hébergement près de la plage','Colombo / airport area':'Colombo / secteur de l’aéroport','Best-fit base':'Étape la mieux adaptée','Prepare for departure':'Préparer le départ','Discover + recover':'Découvrir et se ressourcer','Rest + wellbeing':'Repos et bien-être','Easy final day, transfer planning and departure readiness':'Dernière journée tranquille, préparation du transfert et du départ','Flexible day for wellness, local discovery or rest':'Journée flexible dédiée au bien-être, aux découvertes locales ou au repos','Best-value confirmed stay':'Hébergement confirmé au meilleur rapport qualité-prix','Departure timing will be matched to the confirmed flight.':'L’heure du départ sera adaptée au vol confirmé.','Kept flexible so the human planner can optimise route, budget and availability.':'La flexibilité permet à l’équipe d’optimiser l’itinéraire, le budget et les disponibilités.','Arrival-area stay':'Hébergement près de l’aéroport d’arrivée','Airport pickup, gentle arrival and an unhurried evening':'Accueil à l’aéroport, arrivée en douceur et soirée sans précipitation','Cultural Triangle':'Triangle culturel','Kandy / Hill Country':'Kandy / hautes terres','Hill Country':'Hautes terres'});
Object.assign(optionText.FR,{'Negombo / Colombo area':'Negombo / région de Colombo'});

const translatePlannerText=(language:Lang,text:string)=>{
  if(language==='EN')return text;
  if(!Object.prototype.hasOwnProperty.call(optionText.EN,text))return text;
  const translated=optionText[language][text];
  if(translated)return translated;
  console.warn(`Missing ${language} planner translation for: ${text}`);
  return v4Labels[language].translationMissing;
};
Object.assign(v4Labels.EN,{dayLabel:'Day',restoreLabel:'Restore'});
Object.assign(v4Labels.PL,{dayLabel:'Dzień',restoreLabel:'Regeneracja'});
Object.assign(v4Labels.RU,{dayLabel:'День',restoreLabel:'Восстановление'});
Object.assign(v4Labels.DE,{dayLabel:'Tag',restoreLabel:'Erholung'});
Object.assign(v4Labels.FR,{dayLabel:'Jour',restoreLabel:'Se ressourcer'});
Object.assign(v4Labels.EN,{messageAges:'ages'});
Object.assign(v4Labels.PL,{messageAges:'wiek dzieci'});
Object.assign(v4Labels.RU,{messageAges:'возраст детей'});
Object.assign(v4Labels.DE,{messageAges:'Alter der Kinder'});
Object.assign(v4Labels.FR,{messageAges:'âges'});
Object.assign(v4Labels.EN,{namePlaceholder:'e.g. Silva Family',finalNotePlaceholder:'Optional personalised message…',workspaceHelper:'Select any field to refine the route before sending it to the team.'});
Object.assign(v4Labels.PL,{namePlaceholder:'np. Rodzina Silva',finalNotePlaceholder:'Opcjonalna wiadomość…',workspaceHelper:'Wybierz pole, aby dopracować trasę przed wysłaniem jej do zespołu.'});
Object.assign(v4Labels.RU,{namePlaceholder:'например, семья Силва',finalNotePlaceholder:'Личное сообщение (необязательно)…',workspaceHelper:'Выберите поле, чтобы уточнить маршрут перед отправкой команде.'});
Object.assign(v4Labels.DE,{namePlaceholder:'z. B. Familie Silva',finalNotePlaceholder:'Optionale persönliche Nachricht…',workspaceHelper:'Bearbeiten Sie beliebige Felder, bevor Sie den Plan an das Team senden.'});
Object.assign(v4Labels.FR,{namePlaceholder:'p. ex. famille Silva',finalNotePlaceholder:'Message personnalisé facultatif…',workspaceHelper:'Modifiez les champs souhaités avant d’envoyer l’itinéraire à l’équipe.'});
const formatTravellerCounts=(language:Lang,adults:number,children:number)=>`${adults} ${adults===1?v4Labels[language].adultOne:v4Labels[language].adultPlural} · ${children} ${children===1?v4Labels[language].childOne:v4Labels[language].childPlural}`;
const localizeDayPlan=(day:DayPlan,language:Lang):DayPlan=>{
  const restorePrefix='Restore · ';
  const focus=day.focus.startsWith(restorePrefix)?`${v4Labels[language].restoreLabel} · ${translatePlannerText(language,day.focus.slice(restorePrefix.length))}`:translatePlannerText(language,day.focus);
  return {...day,place:translatePlannerText(language,day.place),focus,activity:translatePlannerText(language,day.activity),stay:translatePlannerText(language,day.stay),notes:translatePlannerText(language,day.notes)};
};
function nightsBetween(a:string,b:string){if(!a||!b)return 0;const x=new Date(a+'T00:00:00'),y=new Date(b+'T00:00:00');return Math.max(0,Math.round((y.getTime()-x.getTime())/86400000));}
function routeIdea(days:number,interests:string[],pace:string,language:Lang='EN'){const d=days||7;const picks:string[]=[];if(interests.some(x=>['Meditation','Ayurveda','Yoga','Reiki','Spirituality'].includes(x)))picks.push('a gentle wellness base with time for reflection');if(interests.includes('Tea')||interests.includes('Nature'))picks.push('Sri Lanka’s green hill country and tea landscapes');if(interests.includes('Wildlife'))picks.push('a carefully paced nature or wildlife experience');if(interests.includes('Culture'))picks.push('a meaningful cultural stop');if(interests.includes('Ocean'))picks.push('a restorative finish by the Indian Ocean');if(!picks.length)picks.push('a balanced mix of nature, culture and unhurried rest');const limit=d<=3?1:d<=5?2:d<=7?3:4;const selected=picks.slice(0,limit).map(value=>translatePlannerText(language,value));const rhythm=pace==='Relaxed'?'fewer bases and more breathing room':pace==='Explore More'?'more variety while keeping travel times sensible':'a balanced mix of discovery and rest';return `${selected.join(v4Labels[language].routeSeparator)}. ${v4Labels[language].routeSuggest} ${translatePlannerText(language,rhythm)}.`;}

type DayPlan={day:number,place:string,focus:string,activity:string,stay:string,notes:string};
function makeDayPlan(nights:number,interests:string[],pace:string,feel:string):DayPlan[]{
 const total=Math.max(3,Math.min(nights||7,21));
 const has=(x:string)=>interests.includes(x); const plan:DayPlan[]=[];
 const add=(day:number,place:string,focus:string,activity:string,stay:string,notes='')=>plan.push({day,place,focus,activity,stay,notes});
 add(1,'Negombo / Colombo area','Arrive · settle · breathe','Airport pickup, gentle arrival and an unhurried evening','Arrival-area stay','Keep the first day light after the flight.');
 let d=2;
 if(has('Culture') && d<=total){add(d++,'Cultural Triangle','Culture + mindful discovery','A carefully paced heritage experience with time to rest','Comfort/value stay');}
 if((has('Ayurveda')||has('Yoga')||has('Meditation')||has('Reiki')||has('Spirituality')) && d<=total){
   const wellnessDays=total>=10?2:1;
   for(let i=0;i<wellnessDays&&d<=total;i++) add(d++,'Wellness base','Restore · '+feel, i===0?'Wellness consultation / gentle practice / free time':'Slow morning, optional Reiki/Ayurveda/yoga and personal time','Wellness / Ayurveda stay','Final services are selected and confirmed by the team.');
 }
 if((has('Tea')||has('Nature')) && d<=total){add(d++,'Kandy / Hill Country','Nature + tea country','Scenic transfer, green landscapes and a slower hill-country afternoon','Value hill-country stay'); if(total>=9&&d<=total)add(d++,'Hill Country','Slow exploration','Tea landscape, nature walk or restful free time','Same stay','Fewer hotel changes can reduce cost and travel fatigue.');}
 if(has('Wildlife') && d<=total)add(d++,'Nature / wildlife region','Nature + wildlife','A responsibly paced wildlife or nature experience','Value nature stay','Exact park/experience depends on route, season and availability.');
 if(has('Ocean') && d<=total)add(d++,'South / West Coast','Ocean reset','Coastal transfer, beach time and a restorative evening','Beach stay');
 while(d<=total){const last=d===total; add(d,last?'Colombo / airport area':'Best-fit base',last?'Prepare for departure':pace==='Explore More'?'Discover + recover':'Rest + wellbeing',last?'Easy final day, transfer planning and departure readiness':'Flexible day for wellness, local discovery or rest','Best-value confirmed stay',last?'Departure timing will be matched to the confirmed flight.':'Kept flexible so the human planner can optimise route, budget and availability.'); d++;}
 return plan;
}
function SmartGuide({lang}:{lang:Lang}){const c=copy[lang],t=optionText[lang],v=v4Labels[lang],fd=finalDocCopy[lang];const [step,setStep]=useState(0);const [arrival,setArrival]=useState('');const [departure,setDeparture]=useState('');const [flexible,setFlexible]=useState(false);const [airport,setAirport]=useState(AIRPORTS[0]);const [flight,setFlight]=useState('');const [landing,setLanding]=useState('');const [pickup,setPickup]=useState('');const [party,setParty]=useState('');const [adults,setAdults]=useState(1);const [children,setChildren]=useState(0);const [ages,setAges]=useState('');const [feel,setFeel]=useState('');const [stay,setStay]=useState('');const [interests,setInterests]=useState<string[]>([]);const [transport,setTransport]=useState('');const [budget,setBudget]=useState('');const [pace,setPace]=useState('');const [notes,setNotes]=useState('');const nights=nightsBetween(arrival,departure);const [editedPlan,setEditedPlan]=useState<DayPlan[]|null>(null);
 const [travellerMode,setTravellerMode]=useState(false);
 const [travellerName,setTravellerName]=useState('');
 const [preferredLanguage,setPreferredLanguage]=useState<Lang>(lang);
 const [journeyRef,setJourneyRef]=useState('CW-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*9000)+1000));
 const [preparedBy,setPreparedBy]=useState('Ceylon Wellness');
 const [finalNote,setFinalNote]=useState('');const [contactName,setContactName]=useState('');const [contactEmail,setContactEmail]=useState('');const [contactPhone,setContactPhone]=useState('');const [delivery,setDelivery]=useState('Email + WhatsApp');const [privacyOk,setPrivacyOk]=useState(false);const toggle=(x:string)=>setInterests(interests.includes(x)?interests.filter(i=>i!==x):interests.length<5?[...interests,x]:interests);const questions=[v.dates,v.travellers,v.wellness,v.stay,c.interestQ,v.transport,v.budget,v.pace];const complete=[flexible|| (!!arrival&&!!departure&&departure>arrival&&!!pickup),!!party&&adults>0,!!feel,!!stay,interests.length>0,!!transport,!!budget,!!pace];const result=routeIdea(nights||7,interests,pace);const generated=makeDayPlan(nights||7,interests,pace,feel);const plan=editedPlan||generated;const reset=()=>{setStep(0);setArrival('');setDeparture('');setFlexible(false);setFlight('');setLanding('');setPickup('');setParty('');setAdults(1);setChildren(0);setAges('');setFeel('');setStay('');setInterests([]);setTransport('');setBudget('');setPace('');setNotes('');setEditedPlan(null)};const dateLine=flexible?'Flexible / not confirmed':`${arrival} → ${departure}${nights?` (${nights} nights)`:''}`;
 const localizedResult=routeIdea(nights||7,interests,pace,lang);const visiblePlan=plan.map(day=>localizeDayPlan(day,lang));const displayDateLine=flexible?v4Labels[lang].flexibleDates:`${arrival} → ${departure}${nights?` (${nights} ${v.nights})`:''}`;
 const planText=plan.map(day=>{const localized=localizeDayPlan(day,preferredLanguage);return `${v4Labels[preferredLanguage].dayLabel} ${day.day} — ${localized.place}: ${localized.focus}. ${localized.activity}`;}).join('\n');
 const cc=contactCopy[lang];const emailValid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);const contactReady=!!contactName.trim()&&emailValid&&!!contactPhone.trim()&&privacyOk;
 const preferredCopy=v4Labels[preferredLanguage];const preferredOption=(value:string)=>translatePlannerText(preferredLanguage,value);const preferredDelivery=delivery==='WhatsApp only'?preferredCopy.messageWhatsAppOnly:preferredCopy.messageEmailWhatsApp;const preferredPickup=pickup==='Yes'?preferredCopy.yes:pickup==='No'?preferredCopy.no:pickup==='Not sure'?preferredCopy.later:preferredCopy.messageToConfirm;
 const message=`${preferredCopy.requestOpening}\n\n${preferredCopy.messageLanguage}: ${preferredLanguage}\n${preferredCopy.messageContact}: ${contactName||preferredCopy.messageToConfirm} · ${contactEmail||preferredCopy.messageEmailTbc} · ${contactPhone||preferredCopy.messagePhoneTbc}\n${preferredCopy.messageDelivery}: ${preferredDelivery}\n${preferredCopy.messageTravel}: ${flexible?preferredCopy.flexibleDates:`${arrival} → ${departure}${nights?` (${nights} ${v4Labels[preferredLanguage].nights})`:''}`}\n${preferredCopy.messageArrival}: ${preferredOption(airport)}\n${preferredCopy.messageFlight}: ${flight||preferredCopy.flightTbc}\n${preferredCopy.messageLanding}: ${landing||preferredCopy.timeTbc}\n${preferredCopy.messagePickup}: ${preferredPickup}\n\n${preferredCopy.messageTravellers}: ${preferredOption(party)} · ${formatTravellerCounts(preferredLanguage,adults,children)}${ages?` · ${v4Labels[preferredLanguage].messageAges} ${ages}`:''}\n${preferredCopy.messageWellness}: ${preferredOption(feel)}\n${preferredCopy.messageInterests}: ${interests.map(preferredOption).join(', ')}\n${preferredCopy.messageStay}: ${preferredOption(stay)}\n${preferredCopy.messageTransport}: ${preferredOption(transport)}\n${preferredCopy.messageBudget}: ${preferredOption(budget)}\n${preferredCopy.messagePace}: ${preferredOption(pace)}\n${preferredCopy.messageNotes}: ${notes||preferredCopy.messageNone}\n\n${preferredCopy.messageDraftPlan}:\n${planText}\n\n${preferredCopy.messageFinish}`;
 const updateDay=(i:number,key:keyof DayPlan,value:string)=>{const next=plan.map((d,idx)=>idx===i?{...d,[key]:value}:d);setEditedPlan(next)};
 const sendJourney=async(e:React.MouseEvent<HTMLAnchorElement>)=>{e.preventDefault();if(!contactReady){document.querySelector('.contactCapture')?.scrollIntoView({behavior:'smooth',block:'center'});alert(cc.required);return;}if(!supabase){window.open(wa(message),'_blank','noopener,noreferrer');return;}
  const {error}=await supabase.from('leads').insert({name:contactName,email:contactEmail,whatsapp:contactPhone,travel_dates:dateLine,duration:nights?`${nights} nights`:'Flexible',travellers:adults+children,wellness_interests:interests,journey_style:feel,accommodation:stay,transport,budget_range:budget,requirements:notes||null,consent:true,consent_at:new Date().toISOString(),privacy_version:'V8-2026-10-04',source:'website-planner',preferred_language:preferredLanguage,currency:null,delivery_preference:delivery,journey_ref:journeyRef,itinerary:plan,arrival_airport:airport,flight_number:flight||null,landing_time:landing||null,airport_pickup:pickup||null});
  if(error){console.error('Lead save failed',error); window.alert(cc.saveError);}
   window.open(wa(message),'_blank','noopener,noreferrer');
 };
 return <div className="smartGuide v4Guide v5Guide"><div className="guideTop"><div><span className="eyebrow">{v.plannerEyebrow}</span><h1>{step<8?questions[step]:v.step8Title}</h1>{step===0&&<p>{v.datesSub}</p>}{step===3&&<p>{v.staySub}</p>}{step===6&&<p>{v.budgetSub}</p>}{step===8&&<p>{v.draftHelper}</p>}</div><div className="freeBadge"><ShieldCheck/><span>{c.free}</span></div></div><div className="stepDots v4Dots">{[0,1,2,3,4,5,6,7].map(i=><span key={i} className={i<=step?'on':''}/>)}</div>
 {step===0&&<div className="travelForm"><label className="checkLine"><input type="checkbox" checked={flexible} onChange={e=>setFlexible(e.target.checked)}/>{v.flex}</label>{!flexible&&<><div className="arrivalBlock"><div className="arrivalTitle"><Plane/><div><b>{v.arrivalTitle}</b><span>{v.arrivalHelper}</span></div></div><div className="fieldGrid"><label>{v.arrival}<input type="date" value={arrival} onChange={e=>setArrival(e.target.value)}/></label><label>{v.departure}<input type="date" min={arrival} value={departure} onChange={e=>setDeparture(e.target.value)}/></label><label>{v.airport}<select value={airport} onChange={e=>setAirport(e.target.value)}>{AIRPORTS.map(x=><option key={x} value={x}>{translatePlannerText(lang,x)}</option>)}</select></label><label>{v.flight}<input placeholder={v.flightPlaceholder} value={flight} onChange={e=>setFlight(e.target.value)}/></label><label>{v.landing}<input type="time" value={landing} onChange={e=>setLanding(e.target.value)}/></label></div><div className="miniTitle">{v.pickup}</div><div className="inlineChoices">{[[v.yes,'Yes'],[v.no,'No'],[v.later,'Not sure']].map(([label,val])=><button className={pickup===val?'selected':''} onClick={()=>setPickup(val)} key={val}>{label}</button>)}</div></div>{nights>0&&<div className="tripLength"><Clock/><b>{nights} {v.nights}</b><span> {v.automatic}</span></div>}</>}</div>}
 {step===1&&<div className="travelForm"><div className="guideChoices compact">{PARTIES.map(x=><button className={party===x?'selected':''} onClick={()=>setParty(x)} key={x}><Users/>{translatePlannerText(lang,x)}</button>)}</div><div className="counterGrid"><label>{v.adults}<input type="number" min="1" max="20" value={adults} onChange={e=>setAdults(Math.max(1,Number(e.target.value)))}/></label><label>{v.children}<input type="number" min="0" max="20" value={children} onChange={e=>setChildren(Math.max(0,Number(e.target.value)))}/></label>{children>0&&<label>{v.ages}<input value={ages} onChange={e=>setAges(e.target.value)} placeholder={v.agePlaceholder}/></label>}</div></div>}
 {step===2&&<div className="guideChoices">{FEELS.map(x=><button className={feel===x?'selected':''} onClick={()=>setFeel(x)} key={x}><Heart/>{t[x]}</button>)}</div>}
 {step===3&&<div className="guideChoices stayChoices">{STAYS.map(x=><button className={stay===x?'selected':''} onClick={()=>setStay(x)} key={x}><Hotel/>{translatePlannerText(lang,x)}</button>)}</div>}
 {step===4&&<><p className="choiceHint">{v.chooseFive}</p><div className="guideChoices interests">{INTERESTS.map(x=><button className={interests.includes(x)?'selected':''} onClick={()=>toggle(x)} key={x}>{interests.includes(x)?<CheckCircle2/>:<Compass/>}{translatePlannerText(lang,x)}</button>)}</div></>}
 {step===5&&<div className="guideChoices stayChoices">{TRANSPORT.map(x=><button className={transport===x?'selected':''} onClick={()=>setTransport(x)} key={x}><MapPin/>{translatePlannerText(lang,x)}</button>)}</div>}
 {step===6&&<><div className="budgetPromise"><Heart/><div><b>{v.budgetFriendly}</b><span>{v.budgetFriendlyText}</span></div></div><div className="guideChoices compact">{BUDGETS.map(x=><button className={budget===x?'selected':''} onClick={()=>setBudget(x)} key={x}><ShieldCheck/>{translatePlannerText(lang,x)}</button>)}</div></>}
 {step===7&&<div className="travelForm"><div className="guideChoices compact">{PACES.map(x=><button className={pace===x?'selected':''} onClick={()=>setPace(x)} key={x}><Footprints/>{translatePlannerText(lang,x)}</button>)}</div><label className="notesField">{v.notes}<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={v.notesPlaceholder}/></label></div>}
 {step===8&&<div className="resultCard v5Result"><div className="resultRoute"><Compass/><div><span>{v.routeHeading}</span><p>{localizedResult}</p></div></div><div className="summaryGrid v4Summary"><b>{v.summaryHeading}</b><span><Clock/> {displayDateLine}</span><span><Plane/> {v.arrivalSummary}: {translatePlannerText(lang,airport)} · {flight||v.flightTbc} · {landing||v.timeTbc} · {v.pickup}: {pickup==='Yes'?v.yes:pickup==='No'?v.no:pickup==='Not sure'?v.later:v.pickupTbc}</span><span><Users/> {translatePlannerText(lang,party)} · {formatTravellerCounts(lang,adults,children)}</span><span><Heart/> {translatePlannerText(lang,feel)}</span><span><Hotel/> {translatePlannerText(lang,stay)}</span><span><Footprints/> {translatePlannerText(lang,pace)}</span><span className="wide"><Sparkles/> {interests.map(x=>translatePlannerText(lang,x)).join(' · ')}</span><span className="wide"><MapPin/> {translatePlannerText(lang,transport)} · {translatePlannerText(lang,budget)}</span></div><div className="contactCapture noPrint"><div className="contactCaptureHead"><div><span className="eyebrow">{v.contactEyebrow}</span><h2>{cc.title}</h2><p>{cc.sub}</p></div><LockKeyhole/></div><div className="contactGrid"><label>{cc.name}<input value={contactName} onChange={e=>{setContactName(e.target.value);if(!travellerName)setTravellerName(e.target.value)}} placeholder={v.namePlaceholder}/></label><label>{cc.email}<div className="iconInput"><Mail/><input type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="name@example.com"/></div></label><label>{cc.phone}<div className="iconInput"><Phone/><input value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+48 …"/></div></label><label>{cc.language}<select value={preferredLanguage} onChange={e=>setPreferredLanguage(e.target.value as Lang)}>{LANGS.map(language=><option key={language} value={language}>{language}</option>)}</select></label></div><div className="deliveryRow"><span>{cc.delivery}</span><button className={delivery==='Email + WhatsApp'?'selected':''} onClick={()=>setDelivery('Email + WhatsApp')}><Mail/> {cc.emailWa}</button><button className={delivery==='WhatsApp only'?'selected':''} onClick={()=>setDelivery('WhatsApp only')}><MessageCircle/> {cc.waOnly}</button></div><label className="privacyConsent"><input type="checkbox" checked={privacyOk} onChange={e=>setPrivacyOk(e.target.checked)}/><span>{cc.privacy} <Link to="/privacy">{cc.privacyLink}</Link>.</span></label><div className="privacySafe"><ShieldCheck/><span>{cc.safe}</span></div>{!contactReady&&<small className="contactRequired">{cc.required}</small>}</div><div className="finalSetup noPrint"><div className="plannerHead"><div><span className="eyebrow">{v.finalBuilderEyebrow}</span><h2>{fd.setup}</h2><p>{fd.setupSub}</p></div><Settings2/></div><div className="finalSetupGrid"><label>{fd.name}<input value={travellerName} onChange={e=>setTravellerName(e.target.value)} placeholder={v.namePlaceholder}/></label><label>{fd.ref}<input value={journeyRef} onChange={e=>setJourneyRef(e.target.value)}/></label><label>{fd.prepared}<input value={preparedBy} onChange={e=>setPreparedBy(e.target.value)}/></label><label className="wide">{fd.note}<textarea rows={2} value={finalNote} onChange={e=>setFinalNote(e.target.value)} placeholder={v.finalNotePlaceholder}/></label></div><div className="finalActions"><button className="button" onClick={()=>setTravellerMode(!travellerMode)}>{travellerMode?<><Pencil/> {fd.edit}</>:<><Eye/> {fd.preview}</>}</button><button className="outlineBtn" onClick={()=>downloadTravellerPdf({name:travellerName||'Traveller',journeyRef:journeyRef||'Journey proposal',travelDates:dateLine,travellers:adults+children,preferredLanguage:preferredLanguage,preparedBy:preparedBy||'Ceylon Wellness',finalNote:finalNote||'Your wellness journey is prepared with care and can be refined by the human team before confirmation.',itinerary:plan.map(day=>({day:day.day,place:day.place,focus:day.focus,activity:day.activity,stay:day.stay,notes:day.notes}))})}><Download/> {fd.pdf}</button><small>{fd.printHint}</small></div></div><div className={`finalDocHeader ${travellerMode?'show':''}`}><span className="eyebrow">CEYLON WELLNESS · {journeyRef}</span><h2>{fd.finalTitle}</h2>{travellerName&&<h3>{travellerName}</h3>}{finalNote&&<p>{finalNote}</p>}<div className="docMeta"><span>{fd.prepared}: {preparedBy}</span><span>{fd.ready}</span></div></div><div className="plannerHead"><div><span className="eyebrow">{travellerMode?fd.itinerary:v.workspaceHeading}</span><h2>{travellerMode?fd.itinerary:v.draftDayHeading}</h2><p>{travellerMode?fd.quote:v.workspaceHelper}</p></div>{travellerMode?<Eye/>:<Pencil/>}</div><div className={`dayPlanner ${travellerMode?'travellerPlan':''}`}>{visiblePlan.map((d,i)=><article className="dayCard" key={i}><div className="dayNo">{v.dayLabel.toUpperCase()} <b>{d.day}</b></div><div className="dayFields"><label>{fd.location}<input readOnly={travellerMode} value={d.place} onChange={e=>updateDay(i,'place',e.target.value)}/></label><label>{fd.focus}<input readOnly={travellerMode} value={d.focus} onChange={e=>updateDay(i,'focus',e.target.value)}/></label><label className="wide">{fd.plan}<textarea readOnly={travellerMode} rows={2} value={d.activity} onChange={e=>updateDay(i,'activity',e.target.value)}/></label><label>{fd.stay}<input readOnly={travellerMode} value={d.stay} onChange={e=>updateDay(i,'stay',e.target.value)}/></label>{!travellerMode&&<label className="plannerInternal">{fd.internal}<input value={d.notes} onChange={e=>updateDay(i,'notes',e.target.value)}/></label>}</div></article>)}</div><div className="quoteReady"><FileText/><div><b>{v.quoteReadyTitle}</b><p>{v.quoteReadyBody}</p></div></div><div className="termsGrid"><article><b>{v.advance}</b><p>{v.advanceText}</p></article><article><b>{v.invoice}</b><p>{v.invoiceText}</p></article></div><p className="guideDisclaimer"><ShieldCheck/> {c.disclaimer}</p><a className="button sendJourney noPrint" href={wa(message)} onClick={sendJourney} target="_blank"><Send/> {c.send}</a></div>}
 <div className="guideNav">{step>0&&<button className="backBtn" onClick={()=>step===8?reset():setStep(step-1)}>{step===8?<><RotateCcw/> {c.restart}</>:c.back}</button>}{step<8&&<button className="button" disabled={!complete[step]} onClick={()=>{if(step===7)setEditedPlan(null);setStep(step+1)}}>{c.next} <ArrowRight/></button>}</div></div>}
function AskCeylon({lang}:{lang:Lang}){const c=copy[lang];return <main className="page askV3"><SmartGuide lang={lang}/><section className="humanStrip"><MessageCircle/><div><b>{publicText(lang,'humanTitle')}</b><span>{publicText(lang,'humanDescription')}</span></div><a href={wa(c.public?.humanMessage||'Hello Ceylon Wellness.')} target="_blank">{PRIMARY.phone} <ArrowRight/></a></section></main>}

function Reiki(){
 const [name,setName]=useState('');const [email,setEmail]=useState('');const [whatsapp,setWhatsapp]=useState('');const [language,setLanguage]=useState('EN');const [level,setLevel]=useState('Not sure yet');const [timezone,setTimezone]=useState('');const [preferred,setPreferred]=useState('');const [notes,setNotes]=useState('');const [consent,setConsent]=useState(false);const [sending,setSending]=useState(false);const [sent,setSent]=useState('');
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!name.trim()||!email.trim()||!whatsapp.trim()||!consent){setSent('Please complete name, email, WhatsApp and consent.');return;}setSending(true);const ref=`REIKI-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;if(supabase){const {error}=await supabase.from('reiki_requests').insert({request_ref:ref,name,email,whatsapp,preferred_language:language,reiki_level:level,timezone:timezone||null,preferred_schedule:preferred||null,notes:notes||null,consent:true,consent_at:new Date().toISOString(),source:'website-reiki'});if(error){console.error('Reiki request save failed',error);setSending(false);setSent('We could not save the request. Please continue on WhatsApp.');window.open(wa(`Hello Ceylon Wellness. Online Reiki request ${ref}. Name: ${name}. Email: ${email}. WhatsApp: ${whatsapp}. Language: ${language}. Level: ${level}. Timezone: ${timezone||'TBC'}. Preferred schedule: ${preferred||'TBC'}. Notes: ${notes||'None'}`),'_blank','noopener,noreferrer');return;}}
 setSending(false);setSent(`Request ${ref} saved. WhatsApp is opening so you can contact the team directly.`);window.open(wa(`Hello Ceylon Wellness. Online Reiki request ${ref}. Name: ${name}. Email: ${email}. WhatsApp: ${whatsapp}. Language: ${language}. Level: ${level}. Timezone: ${timezone||'TBC'}. Preferred schedule: ${preferred||'TBC'}. Notes: ${notes||'None'}`),'_blank','noopener,noreferrer');};
 return <main className="page reikiV5"><section className="reikiCourseHero"><div><span className="eyebrow">ONLINE REIKI · CEYLON WELLNESS</span><h1>Learn and explore Reiki from wherever you are.</h1><p className="lead">A dedicated online Reiki pathway with Tatsiana, presented for personal wellbeing, relaxation, reflection and mindful practice. Course details are confirmed personally before registration.</p><div className="actions"><a className="button" href={wa('Hello Ceylon Wellness. I would like information about the Online Reiki course with Tatsiana: level, dates, format, language, price and certificate.')} target="_blank"><MessageCircle/> Ask about the course</a><a className="textLink" href="#reiki-request">Send a request <ArrowRight/></a></div></div><div className="reikiPromise"><Sparkles/><b>Separate from your Sri Lanka trip</b><p>Online Reiki is a standalone Ceylon Wellness service. Travellers may also select Reiki as an interest inside the Sri Lanka Journey Planner.</p></div></section><section id="course" className="courseGrid"><article><span>01</span><h3>Choose your level</h3><p>Level One / Level Two pathway will be published from the final approved course programme.</p></article><article><span>02</span><h3>Confirm the format</h3><p>Dates, live/online structure, language, duration and what is included are confirmed before registration.</p></article><article><span>03</span><h3>Clear price & terms</h3><p>No invented pricing. Final fee, payment conditions, cancellation/refund terms and certificate details are confirmed first.</p></article></section>
 <section id="reiki-request" className="contactCapture" style={{marginTop:'2rem'}}><span className="eyebrow">ONLINE REIKI REQUEST</span><h2>Request a personal Reiki consultation</h2><p>Send the essentials. A human confirms the suitable level, schedule, fee and terms before registration or payment.</p><form onSubmit={submit} className="adminEditGrid"><label>Name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>WhatsApp / phone<input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} required/></label><label>Preferred language<input list="reiki-language-options" value={language} onChange={e=>setLanguage(e.target.value)} placeholder="Select or type a language"/><datalist id="reiki-language-options">{ADMIN_LANGUAGE_SUGGESTIONS.map(x=><option key={x} value={x}/>)}</datalist></label><label>Reiki level<select value={level} onChange={e=>setLevel(e.target.value)}><option>Not sure yet</option><option>Level One</option><option>Level Two</option><option>Personal session / consultation</option></select></label><label>Timezone<input placeholder="e.g. Europe/Warsaw" value={timezone} onChange={e=>setTimezone(e.target.value)}/></label><label>Preferred date / time<input placeholder="Optional" value={preferred} onChange={e=>setPreferred(e.target.value)}/></label><label style={{gridColumn:'1 / -1'}}>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What would you like to ask or explore?"/></label><label style={{gridColumn:'1 / -1',display:'flex',gap:'.6rem',alignItems:'flex-start'}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{width:'auto'}}/> I agree that Ceylon Wellness may use these details to respond to this Reiki request. This is not marketing consent.</label><button className="button" disabled={sending}>{sending?'Sending…':'Send Reiki request'} <Send/></button>{sent&&<p className="adminNotice">{sent}</p>}</form></section>
 <section className="certSection"><div><span className="eyebrow">SUPPLIED CREDENTIAL DOCUMENTATION</span><h2>Tatsiana · Usui Reiki</h2><p>These supplied certificates support the current practitioner profile. Final course/teacher claims will only use approved documentation.</p></div><div className="certs"><article><img src="/certificates/reiki-level-one.jpeg"/><h3>Usui Reiki Level One</h3><p>Supplied certificate · 1 January 2026</p></article><article><img src="/certificates/reiki-level-two.jpeg"/><h3>Usui Reiki Level Two</h3><p>Supplied certificate · 22 February 2026</p></article></div></section><div className="wellnessBoundary"><ShieldCheck/><p>Reiki is presented as a complementary wellbeing practice. It is not medical diagnosis or treatment and does not replace appropriate healthcare.</p></div></main>
}
function Vipula(){return <main className="page"><span className="eyebrow">DR. VIPULA WANIGASEKERA</span><h1>Wellness, reflection and Sri Lankan experience.</h1><p className="lead">Ceylon Wellness uses Dr. Vipula’s authorised profile information for this experience. Detailed biography and credentials will be published only from supplied or verified sources.</p><div className="profile"><div className="portrait">VW</div><div><h2>Meet Dr. Vipula</h2><p>His Ceylon Wellness profile brings together verified Sri Lankan tourism experience, meditation, spirituality and Reiki-related content.</p><a className="button" href="https://www.youtube.com/watch?v=CmwFc7DDFG8&t=1265s" target="_blank">Watch video <ExternalLink/></a></div></div></main>}
function Simple({title,lang}:{title:string;lang:Lang}){const titleKey:Record<string,string>={'Wellness, designed around you.':'simpleWellness','Sri Lanka, experienced with intention.':'simpleSriLanka','Founder-managed. Human-centred.':'simpleAbout','Page not found':'simpleNotFound'};return <main className="page"><span className="eyebrow">CEYLON WELLNESS</span><h1>{titleKey[title]?publicText(lang,titleKey[title]):title}</h1><p className="lead">{publicText(lang,'simpleDescription')}</p><CTA lang={lang}/></main>}
function Privacy(){return <main className="page prose privacyPage"><span className="eyebrow">PRIVACY · DATA MINIMISATION</span><h1>Privacy information</h1><p><b>Planner privacy:</b> the current free planner runs in your browser. Contact details entered in the V7 contact card are not saved to a Ceylon Wellness database by this static website. They are included only when you choose to open and send the prepared WhatsApp message.</p><p><b>Why we ask:</b> name, email, WhatsApp/phone and preferred language help us respond to the journey request, refine the itinerary and deliver traveller-approved documents. We do not ask for passport files in this planner.</p><p><b>Wellness information:</b> share only what is useful for planning. Do not enter detailed medical records or diagnoses in the notes field. Wellness planning does not replace medical advice.</p><p><b>Marketing:</b> journey contact details are not treated as marketing consent. Any future marketing consent must be separate and optional.</p><p><b>WhatsApp:</b> when you choose to send a message, your communication is handled through WhatsApp under its own service terms and privacy practices.</p><p className="legalDraft">This is the product privacy foundation, not the final legal policy. Before commercial launch, the final controller identity, contact details, retention periods, recipients/processors, legal bases and data-subject rights must be completed and professionally reviewed.</p></main>}
function Legal({title}:{title:string}){return <main className="page prose"><span className="eyebrow">DRAFT · PROFESSIONAL REVIEW REQUIRED</span><h1>{title}</h1><p>Final legal content will be published only after business approval and appropriate professional review. Ceylon Wellness does not invent legal terms.</p></main>}

type AdminLead={id:string,name:string|null,email:string|null,whatsapp:string|null,travel_dates:string|null,duration:string|null,travellers:number|null,wellness_interests:string[]|null,journey_style:string|null,accommodation:string|null,transport:string|null,budget_range:string|null,requirements:string|null,status:string,preferred_language:string|null,delivery_preference:string|null,journey_ref:string|null,itinerary:DayPlan[]|null,arrival_airport:string|null,flight_number:string|null,landing_time:string|null,airport_pickup:string|null,currency:string|null,total_price:number|null,advance_deposit_type:string|null,advance_deposit_value:number|null,advance_amount:number|null,remaining_balance:number|null,advance_due_date:string|null,balance_due_date:string|null,quotation_valid_until:string|null,booking_status:string|null,accommodation_booking_status:string|null,transport_booking_status:string|null,wellness_booking_status:string|null,accommodation_booking_details:string|null,transport_booking_details:string|null,wellness_booking_details:string|null,price_includes:string|null,price_excludes:string|null,traveller_payment_instructions:string|null,traveller_cancellation_terms:string|null,supplier_cost:number|null,supplier_reference:string|null,internal_margin:number|null,internal_commercial_notes:string|null,admin_notes?:string|null,deleted_at?:string|null,deleted_reason?:string|null,created_at:string,updated_at?:string|null};
type ReikiRequest={id:string,request_ref:string|null,name:string|null,email:string|null,whatsapp:string|null,preferred_language:string|null,reiki_level:string|null,timezone:string|null,preferred_schedule:string|null,notes:string|null,status:string,admin_notes:string|null,consent:boolean,created_at:string,updated_at?:string|null,deleted_at?:string|null,deleted_reason?:string|null};
const LEAD_STATUSES=['NEW','CONTACTED','QUALIFYING','QUOTATION_PREPARING','QUOTATION_SENT','AWAITING_PAYMENT','PAYMENT_RECEIVED','CONFIRMED','COMPLETED','CANCELLED'];
const REIKI_STATUSES=['NEW','CONTACTED','CONSULTATION_PLANNED','AWAITING_PAYMENT','PAYMENT_RECEIVED','CONFIRMED','COMPLETED','CANCELLED'];
const FINAL_BOOKING_STATUSES=['DRAFT','QUOTATION_SENT','AWAITING_ADVANCE','ADVANCE_PAID','BOOKING_CONFIRMED','FULLY_PAID','COMPLETED','CANCELLED'];
const BOOKING_ITEM_STATUSES=['Pending','Confirmed'];
const CURRENCY_OPTIONS=['EUR','USD','PLN','GBP','LKR'];
const formatMoney=(amount:number|null|undefined,currency?:string|null)=>{if(amount===null||amount===undefined||!Number.isFinite(Number(amount)))return 'TBC';const value=Number(amount);return `${currency?.trim()||'Currency required'} ${value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;};
const getAdvanceSummary=(lead:Partial<AdminLead>|null)=>{const total=Number(lead?.total_price ?? 0);const depositValue=Number(lead?.advance_deposit_value ?? 0);const type=lead?.advance_deposit_type || 'percentage';const calculated=type==='fixed_amount' ? depositValue : total * (depositValue / 100);const advance=Math.max(0, Number.isFinite(calculated)?calculated:0);const remaining=Math.max(total-advance,0);return {advanceAmount:advance,remainingBalance:remaining};};
const getJourneyPricingValidationError=(lead:Partial<AdminLead>|null)=>{
  const amount=(value:string|number|null|undefined)=>{
    if(value===null||value===undefined||String(value).trim()==='')return null;
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:null;
  };
  if(!lead)return 'Journey pricing is unavailable. Reopen the journey and try again.';
  const total=amount(lead.total_price);
  if(total===null||total<=0)return 'Enter a valid positive Total Journey Price before downloading the Traveller PDF.';
  if(!lead.currency?.trim())return 'Select a currency before downloading the Traveller PDF.';
  const depositValue=amount(lead.advance_deposit_value);
  const depositType=lead.advance_deposit_type||'percentage';
  if(depositValue===null||depositValue<=0||(depositType!=='percentage'&&depositType!=='fixed_amount'))return 'Enter a valid advance deposit type and value.';
  if(depositType==='percentage'&&depositValue>=100)return 'The deposit percentage must leave a positive remaining balance.';
  if(depositType==='fixed_amount'&&depositValue>=total)return 'The advance amount must be less than the total journey price.';
  const expectedAdvance=depositType==='fixed_amount'?depositValue:total*(depositValue/100);
  const expectedBalance=total-expectedAdvance;
  const summary=getAdvanceSummary(lead);
  if(!Number.isFinite(expectedAdvance)||expectedAdvance<=0||!Number.isFinite(expectedBalance)||expectedBalance<=0||!Number.isFinite(summary.advanceAmount)||summary.advanceAmount<=0||!Number.isFinite(summary.remainingBalance)||summary.remainingBalance<=0||Math.abs(summary.advanceAmount-expectedAdvance)>0.001||Math.abs(summary.remainingBalance-expectedBalance)>0.001){
    return 'Advance and remaining balance must be positive and consistent with the current total and deposit.';
  }
  return null;
};
const getBookingStatus=(value:string|null|undefined)=> value==='Confirmed' ? 'Confirmed' : 'Pending';
const downloadSavedLeadPdf=(lead:AdminLead)=>downloadTravellerPdf({name:lead.name,journeyRef:lead.journey_ref,travelDates:lead.travel_dates,travellers:lead.travellers,preferredLanguage:lead.preferred_language,preparedBy:'Ceylon Wellness',finalNote:lead.requirements||'Journey details are subject to human confirmation.',itinerary:(lead.itinerary||[]).map(day=>({day:day.day,place:day.place,focus:day.focus,activity:day.activity,stay:day.stay,notes:day.notes})),arrivalAirport:lead.arrival_airport,flightNumber:lead.flight_number,landingTime:lead.landing_time,airportPickup:lead.airport_pickup,journeyStyle:lead.journey_style,accommodation:lead.accommodation,transport:lead.transport,budgetRange:lead.budget_range,requirements:lead.requirements,currency:lead.currency,totalPrice:lead.total_price,advanceDepositType:lead.advance_deposit_type,advanceDepositValue:lead.advance_deposit_value,advanceAmount:lead.advance_amount,remainingBalance:lead.remaining_balance,advanceDueDate:lead.advance_due_date,balanceDueDate:lead.balance_due_date,quotationValidUntil:lead.quotation_valid_until,bookingStatus:lead.booking_status,accommodationStatus:lead.accommodation_booking_status,transportStatus:lead.transport_booking_status,wellnessStatus:lead.wellness_booking_status,accommodationDetails:lead.accommodation_booking_details,transportDetails:lead.transport_booking_details,wellnessDetails:lead.wellness_booking_details,priceIncludes:lead.price_includes,priceExcludes:lead.price_excludes,paymentInstructions:lead.traveller_payment_instructions,cancellationTerms:lead.traveller_cancellation_terms});
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[char] as string));

function AdminWorkspace(){
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [session,setSession]=useState<any>(null);const [tab,setTab]=useState<'travel'|'reiki'>('travel');const [leads,setLeads]=useState<AdminLead[]>([]);const [reiki,setReiki]=useState<ReikiRequest[]>([]);const [selected,setSelected]=useState<AdminLead|null>(null);const [selectedReiki,setSelectedReiki]=useState<ReikiRequest|null>(null);const [query,setQuery]=useState('');const [notice,setNotice]=useState('');const [loading,setLoading]=useState(false);const [editing,setEditing]=useState(false);const [draft,setDraft]=useState<AdminLead|null>(null);const [reikiDraft,setReikiDraft]=useState<ReikiRequest|null>(null);const [showTrash,setShowTrash]=useState(false);const [role,setRole]=useState('');const [trashSelection,setTrashSelection]=useState<string[]>([]);const [showInternalAdvanced,setShowInternalAdvanced]=useState(false);const [journeyFinalised,setJourneyFinalised]=useState(false);const [workspaceTab,setWorkspaceTab]=useState<'overview'|'journey'|'price'|'booking'|'terms'|'internal'>('overview');const [expandedDay,setExpandedDay]=useState<number|null>(null);const [deleteModal,setDeleteModal]=useState<{mode:'soft'|'hard';kind:'travel'|'reiki';id:string;name:string;reference:string;selectedIds?:string[];reason:string;customReason:string}|null>(null);const DELETE_REASON_OPTIONS=['Duplicate / Test record','Created by mistake','Invalid / Spam request','Traveller requested deletion','Data retention / privacy','No longer required','Other'];
 const audit=async(action:string,entity_type:string,entity_id:string,metadata:any={})=>{if(!supabase)return;await supabase.from('audit_logs').insert({actor_id:session?.user?.id||null,actor_type:'user',action,entity_type,entity_id,metadata});};
 const load=async()=>{if(!supabase)return;setLoading(true);const [a,b,c]=await Promise.all([supabase.from('leads').select('*').order('created_at',{ascending:false}),supabase.from('reiki_requests').select('*').order('created_at',{ascending:false}),supabase.from('user_roles').select('role').eq('user_id',session?.user?.id||'')]);setLoading(false);if(a.error||b.error){setNotice('Admin data could not be loaded. Check the V9 migration and permissions.');return;}setLeads((a.data||[]) as AdminLead[]);setReiki((b.data||[]) as ReikiRequest[]);setRole(c.data?.some((x:any)=>x.role==='SUPER_ADMIN')?'SUPER_ADMIN':(c.data?.[0]?.role||''));setNotice('');};
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe();},[]);
 useEffect(()=>{if(session)load();},[session]);
 if(!supabaseConfigured)return <main className="page adminPage"><span className="eyebrow">V9 · CEYLON WELLNESS OS</span><h1>Admin setup required</h1><p className="lead">Secure shared editing is disabled until Supabase is configured.</p></main>;
 const login=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase)return;setLoading(true);const {error}=await supabase.auth.signInWithPassword({email,password});setLoading(false);if(error)setNotice('Login failed. Check your email/password or admin setup.');};
 if(!session)return <main className="page adminPage"><div className="adminLogin"><LockKeyhole/><span className="eyebrow">CEYLON WELLNESS · PRIVATE</span><h1>Planner sign in</h1><p>For authorised Ceylon Wellness planners only.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="button" disabled={loading}><LogIn/> {loading?'Signing in…':'Sign in'}</button></form>{notice&&<p className="adminNotice">{notice}</p>}</div></main>;
  const saveLead=async():Promise<AdminLead|null>=>{if(!supabase||!draft)return null;const advance=getAdvanceSummary(draft);const payload={name:draft.name,email:draft.email,whatsapp:draft.whatsapp,travel_dates:draft.travel_dates,duration:draft.duration,travellers:draft.travellers,wellness_interests:draft.wellness_interests,journey_style:draft.journey_style,accommodation:draft.accommodation,transport:draft.transport,budget_range:draft.budget_range,requirements:draft.requirements,status:draft.status,preferred_language:draft.preferred_language,delivery_preference:draft.delivery_preference,arrival_airport:draft.arrival_airport,flight_number:draft.flight_number,landing_time:draft.landing_time,airport_pickup:draft.airport_pickup,currency:draft.currency?.trim()||null,total_price:typeof draft.total_price==='number'?draft.total_price:(draft.total_price!==null&&draft.total_price!==undefined?Number(draft.total_price):null),advance_deposit_type:draft.advance_deposit_type||'percentage',advance_deposit_value:typeof draft.advance_deposit_value==='number'?draft.advance_deposit_value:(draft.advance_deposit_value!==null&&draft.advance_deposit_value!==undefined?Number(draft.advance_deposit_value):null),advance_amount:advance.advanceAmount || null,remaining_balance:advance.remainingBalance || null,advance_due_date:draft.advance_due_date,balance_due_date:draft.balance_due_date,quotation_valid_until:draft.quotation_valid_until,booking_status:draft.booking_status,accommodation_booking_status:draft.accommodation_booking_status||'Pending',transport_booking_status:draft.transport_booking_status||'Pending',wellness_booking_status:draft.wellness_booking_status||'Pending',accommodation_booking_details:draft.accommodation_booking_details,transport_booking_details:draft.transport_booking_details,wellness_booking_details:draft.wellness_booking_details,price_includes:draft.price_includes,price_excludes:draft.price_excludes,traveller_payment_instructions:draft.traveller_payment_instructions,traveller_cancellation_terms:draft.traveller_cancellation_terms,supplier_cost:typeof draft.supplier_cost==='number'?draft.supplier_cost:(draft.supplier_cost!==null&&draft.supplier_cost!==undefined?Number(draft.supplier_cost):null),supplier_reference:draft.supplier_reference,internal_margin:typeof draft.internal_margin==='number'?draft.internal_margin:(draft.internal_margin!==null&&draft.internal_margin!==undefined?Number(draft.internal_margin):null),internal_commercial_notes:draft.internal_commercial_notes,admin_notes:draft.admin_notes,updated_at:new Date().toISOString()};try{const {data,error}=await supabase.from('leads').update(payload).eq('id',draft.id).select('*').single();if(error||!data){setNotice('Could not save journey.');return null;}try{await audit('UPDATE','lead',draft.id,{journey_ref:draft.journey_ref});}catch(auditError){console.error('Journey audit failed',auditError);}const savedLead=data as AdminLead;setSelected(savedLead);setDraft(savedLead);setEditing(false);setNotice('Journey saved.');await load();return savedLead;}catch(error){console.error('Journey save failed',error);setNotice('Could not save journey.');return null;}};
  const saveAndDownloadPdf=async()=>{
    if(!draft)return;
    const validationError=getJourneyPricingValidationError(draft);
    if(validationError){setNotice(validationError);return;}
    const currentPricing={
      currency:draft.currency?.trim()||'',
      totalPrice:Number(draft.total_price),
      depositType:draft.advance_deposit_type||'percentage',
      depositValue:Number(draft.advance_deposit_value),
      ...getAdvanceSummary(draft)
    };
    const savedLead=await saveLead();
    if(!savedLead)return;
    const savedPricingError=getJourneyPricingValidationError(savedLead);
    const savedAdvance=Number(savedLead.advance_amount);
    const savedBalance=Number(savedLead.remaining_balance);
    if(savedPricingError||savedLead.currency?.trim()!==currentPricing.currency||savedLead.advance_deposit_type!==currentPricing.depositType||Math.abs(Number(savedLead.total_price)-currentPricing.totalPrice)>0.01||Math.abs(Number(savedLead.advance_deposit_value)-currentPricing.depositValue)>0.01||!Number.isFinite(savedAdvance)||Math.abs(savedAdvance-currentPricing.advanceAmount)>0.01||!Number.isFinite(savedBalance)||Math.abs(savedBalance-currentPricing.remainingBalance)>0.01){
      setNotice('Journey saved, but its saved pricing did not match the validated editor values. The Traveller PDF was not downloaded.');
      return;
    }
    try{await downloadSavedLeadPdf(savedLead);setNotice('Journey saved and Traveller PDF downloaded.');}catch(error){console.error('Traveller PDF generation failed',error);setNotice('Journey saved, but the Traveller PDF could not be generated.');}
  };
const saveReiki=async()=>{if(!supabase||!reikiDraft)return;const payload={name:reikiDraft.name,email:reikiDraft.email,whatsapp:reikiDraft.whatsapp,preferred_language:reikiDraft.preferred_language,reiki_level:reikiDraft.reiki_level,timezone:reikiDraft.timezone,preferred_schedule:reikiDraft.preferred_schedule,notes:reikiDraft.notes,status:reikiDraft.status,admin_notes:reikiDraft.admin_notes,updated_at:new Date().toISOString()};const {error}=await supabase.from('reiki_requests').update(payload).eq('id',reikiDraft.id);if(error){setNotice('Could not save Reiki request.');return;}await audit('UPDATE','reiki_request',reikiDraft.id,{request_ref:reikiDraft.request_ref});setSelectedReiki(reikiDraft);setEditing(false);setNotice('Reiki request saved.');await load();};
 const updateStatus=async(kind:'travel'|'reiki',id:string,status:string)=>{if(!supabase)return;const table=kind==='travel'?'leads':'reiki_requests';const {error}=await supabase.from(table).update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error){setNotice('Could not update status.');return;}await audit('STATUS_CHANGE',kind==='travel'?'lead':'reiki_request',id,{status});if(kind==='travel'&&selected?.id===id)setSelected({...selected,status});if(kind==='reiki'&&selectedReiki?.id===id)setSelectedReiki({...selectedReiki,status});await load();};
 const openSoftDelete=(kind:'travel'|'reiki',id:string,name:string,reference:string)=>{setDeleteModal({mode:'soft',kind,id,name,reference,reason:'',customReason:''});};
 const openPermanentDelete=(kind:'travel'|'reiki',id:string,name:string,reference:string)=>{setDeleteModal({mode:'hard',kind,id,name,reference,reason:DELETE_REASON_OPTIONS[0],customReason:''});};
 const openPermanentDeleteSelected=()=>{if(!supabase||role!=='SUPER_ADMIN'||!trashSelection.length)return;const target=(tab==='travel'?travelFiltered:reikiFiltered).filter(x=>trashSelection.includes(x.id));if(!target.length)return;const first=target[0] as Partial<AdminLead> & Partial<ReikiRequest>;const name=target.length>1?`${target.length} selected records`:first.name||'Record';const reference=target.length>1?`${target.length} records`:tab==='travel' ? ((first as AdminLead).journey_ref || (first as ReikiRequest).request_ref || 'Record') : ((first as ReikiRequest).request_ref || (first as AdminLead).journey_ref || 'Record');const ids=target.map(x=>x.id);setDeleteModal({mode:'hard',kind:tab,id:'',name,reference,selectedIds:ids,reason:DELETE_REASON_OPTIONS[0],customReason:''});};
 const confirmSoftDelete=async()=>{if(!supabase||!deleteModal||deleteModal.mode!=='soft')return;const table=deleteModal.kind==='travel'?'leads':'reiki_requests';const {error}=await supabase.from(table).update({deleted_at:new Date().toISOString(),deleted_reason:'Soft deleted by admin',updated_at:new Date().toISOString()}).eq('id',deleteModal.id);if(error){setNotice('Could not move record to Trash.');setDeleteModal(null);return;}await audit('TRASH',deleteModal.kind==='travel'?'lead':'reiki_request',deleteModal.id,{reason:'Soft deleted by admin'});if(deleteModal.kind==='travel')setSelected(null);else setSelectedReiki(null);setEditing(false);setNotice('Moved to Trash.');setDeleteModal(null);await load();};
 const confirmPermanentDelete=async()=>{if(!supabase||role!=='SUPER_ADMIN'||!deleteModal||deleteModal.mode!=='hard')return;const reason=deleteModal.reason==='Other'?deleteModal.customReason.trim():deleteModal.reason;if(!reason){setNotice('Please choose or add a delete reason.');return;}const ids=deleteModal.selectedIds && deleteModal.selectedIds.length ? deleteModal.selectedIds : [deleteModal.id];const relType=deleteModal.kind==='travel'?'lead':'reiki_request';const auditId=deleteModal.id || ids[0] || 'bulk';if(deleteModal.selectedIds && deleteModal.selectedIds.length){const travelIds=deleteModal.kind==='travel'?deleteModal.selectedIds:[];const reikiIds=deleteModal.kind==='reiki'?deleteModal.selectedIds:[]; if(travelIds.length){await supabase.from('leads').delete().in('id',travelIds);} if(reikiIds.length){await supabase.from('reiki_requests').delete().in('id',reikiIds);}} else {const table=deleteModal.kind==='travel'?'leads':'reiki_requests';const {error}=await supabase.from(table).delete().eq('id',deleteModal.id);if(error){setNotice('Permanent delete failed.');setDeleteModal(null);return;}}await audit('PERMANENT_DELETE',relType,auditId,{reason,selectedIds:ids});setDeleteModal(null);setTrashSelection([]);if(deleteModal.kind==='travel')setSelected(null);else setSelectedReiki(null);setNotice('Record permanently deleted.');await load();};
 const restore=async(kind:'travel'|'reiki',id:string)=>{if(!supabase)return;const table=kind==='travel'?'leads':'reiki_requests';const {error}=await supabase.from(table).update({deleted_at:null,deleted_reason:null,updated_at:new Date().toISOString()}).eq('id',id);if(error){setNotice('Could not restore record.');return;}await audit('RESTORE',kind==='travel'?'lead':'reiki_request',id);setNotice('Record restored.');await load();};
 const restoreSelected=async()=>{if(!supabase||!trashSelection.length)return;const travelIds=leads.filter(x=>x.deleted_at && trashSelection.includes(x.id)).map(x=>x.id);const reikiIds=reiki.filter(x=>x.deleted_at && trashSelection.includes(x.id)).map(x=>x.id);if(travelIds.length){const {error}=await supabase.from('leads').update({deleted_at:null,deleted_reason:null,updated_at:new Date().toISOString()}).in('id',travelIds);if(error){setNotice('Could not restore selected travel records.');return;}}if(reikiIds.length){const {error}=await supabase.from('reiki_requests').update({deleted_at:null,deleted_reason:null,updated_at:new Date().toISOString()}).in('id',reikiIds);if(error){setNotice('Could not restore selected Reiki records.');return;}}setTrashSelection([]);setNotice('Selected records restored.');await load();};
 const toggleTrashSelection=(id:string)=>{setTrashSelection((current)=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);};
 const clearTrashSelection=()=>setTrashSelection([]);
 const selectAllVisible=()=>{const ids=(tab==='travel'?travelFiltered:reikiFiltered).map(x=>x.id);setTrashSelection(ids);};
 const addDay=()=>{if(!draft)return;const list=[...(draft.itinerary||[])];list.push({day:list.length+1,place:'',focus:'',activity:'',stay:'',notes:''});setDraft({...draft,itinerary:list});};
 const changeDay=(i:number,key:keyof DayPlan,value:any)=>{if(!draft)return;const list=(draft.itinerary||[]).map((d,n)=>n===i?{...d,[key]:value}:d);setDraft({...draft,itinerary:list});};
 const removeDay=(i:number)=>{if(!draft)return;const list=(draft.itinerary||[]).filter((_d,n)=>n!==i).map((d,n)=>({...d,day:n+1}));setDraft({...draft,itinerary:list});};
 const travelFiltered=leads.filter(x=>Boolean(x.deleted_at)===showTrash&&(`${x.name} ${x.email} ${x.whatsapp} ${x.journey_ref}`).toLowerCase().includes(query.toLowerCase()));
 const reikiFiltered=reiki.filter(x=>Boolean(x.deleted_at)===showTrash&&(`${x.name} ${x.email} ${x.whatsapp} ${x.request_ref} ${x.reiki_level}`).toLowerCase().includes(query.toLowerCase()));
 const openTravel=(x:AdminLead)=>{setSelected(x);setSelectedReiki(null);setDraft({...x,itinerary:(x.itinerary||[]).map(d=>({...d}))});setEditing(false);};
 const openReiki=(x:ReikiRequest)=>{setSelectedReiki(x);setSelected(null);setReikiDraft({...x});setEditing(false);};
 const emailLink=(to:string|null,subject:string,body:string)=>`mailto:${to||''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
 const generateTravellerPdf=(lead:AdminLead)=>{if(typeof window==='undefined')return;const invoiceSummary=getAdvanceSummary(lead);const itinerary=(lead.itinerary||[]).map(day=>`<div class="day"><h4>Day ${day.day}</h4><p><strong>Location:</strong> ${day.place||'TBC'}</p><p><strong>Focus:</strong> ${day.focus||'TBC'}</p><p><strong>Plan:</strong> ${day.activity||'TBC'}</p><p><strong>Stay:</strong> ${day.stay||'TBC'}</p><p><strong>Notes:</strong> ${day.notes||'—'}</p></div>`).join('')||'<p>No day-by-day itinerary has been added yet.</p>';
 const html=`<!doctype html><html><head><meta charset="UTF-8"/><title>${lead.name||'Ceylon Wellness Journey'} · Final Journey</title><style>body{font-family:Arial,sans-serif;background:#f3efe7;color:#18261f;margin:0;padding:28px}.sheet{max-width:900px;margin:0 auto;background:#fff;padding:32px;border:1px solid #d8dfd7;border-radius:18px}.brand{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid #e7ebea}.brand h1{margin:0;font-size:30px;color:#163a2b}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px;margin:24px 0}.meta div{border:1px solid #e7ebea;padding:12px;border-radius:10px}.section{margin-top:24px;padding-top:18px;border-top:1px solid #e7ebea}.section h2{font-size:20px;color:#163a2b;margin:0 0 12px}.day{border:1px solid #ebf0ed;padding:12px;border-radius:10px;margin-top:12px}.day h4{margin:0 0 6px;font-size:16px}.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px}.summary div{padding:12px;border-radius:10px;background:#f8f7f3;border:1px solid #e7ebea}.small{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#68766c}.strong{font-weight:700}.foot{margin-top:30px;font-size:12px;color:#667068;line-height:1.6} @media print{body{padding:0;background:#fff}.sheet{border:none;border-radius:0;max-width:none;padding:24px}} </style></head><body><div class="sheet"><div class="brand"><div><div class="small">Ceylon Wellness</div><h1>Final Journey Proposal / Quotation</h1></div><div class="small">${lead.journey_ref||'Journey proposal'}<br/>${lead.booking_status||'Draft'}</div></div><div class="meta"><div><div class="small">Traveller</div><div class="strong">${lead.name||'Traveller'}</div></div><div><div class="small">Preferred language</div><div class="strong">${lead.preferred_language||'—'}</div></div><div><div class="small">Travel dates</div><div class="strong">${lead.travel_dates||'TBC'}</div></div><div><div class="small">Travellers</div><div class="strong">${lead.travellers||1}</div></div><div><div class="small">Arrival airport</div><div class="strong">${lead.arrival_airport||'TBC'}</div></div><div><div class="small">Flight</div><div class="strong">${lead.flight_number||'TBC'}</div></div><div><div class="small">Airport pickup</div><div class="strong">${lead.airport_pickup||'TBC'}</div></div><div><div class="small">Journey style</div><div class="strong">${lead.journey_style||'TBC'}</div></div></div><div class="section"><h2>Pricing & payment</h2><div class="summary"><div><div class="small">Total price</div><div class="strong">${lead.currency||'USD'} ${Number(lead.total_price ?? 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div><div><div class="small">Advance deposit</div><div class="strong">${lead.advance_deposit_type==='fixed_amount' ? (lead.advance_deposit_value || 0) : (lead.advance_deposit_value || 0) + '%'}</div></div><div><div class="small">Advance amount</div><div class="strong">${lead.currency||'USD'} ${invoiceSummary.advanceAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div><div><div class="small">Remaining balance</div><div class="strong">${lead.currency||'USD'} ${invoiceSummary.remainingBalance.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div><div><div class="small">Advance due date</div><div class="strong">${lead.advance_due_date||'TBC'}</div></div><div><div class="small">Balance due date</div><div class="strong">${lead.balance_due_date||'TBC'}</div></div><div><div class="small">Quotation valid until</div><div class="strong">${lead.quotation_valid_until||'TBC'}</div></div><div><div class="small">Booking status</div><div class="strong">${lead.booking_status||'Draft'}</div></div></div></div><div class="section"><h2>Journey details</h2><div class="summary"><div><div class="small">Accommodation</div><div class="strong">${lead.accommodation||'TBC'}</div></div><div><div class="small">Transport</div><div class="strong">${lead.transport||'TBC'}</div></div><div><div class="small">Wellness / activity</div><div class="strong">${lead.wellness_booking_details||'TBC'}</div></div><div><div class="small">Price includes</div><div class="strong">${lead.price_includes||'TBC'}</div></div><div><div class="small">Price excludes</div><div class="strong">${lead.price_excludes||'TBC'}</div></div><div><div class="small">Payment instructions</div><div class="strong">${lead.traveller_payment_instructions||'TBC'}</div></div><div style="grid-column:1 / -1"><div class="small">Cancellation / refund terms</div><div class="strong">${lead.traveller_cancellation_terms||'TBC'}</div></div></div></div><div class="section"><h2>Itinerary</h2>${itinerary}</div><div class="foot"><p>Ceylon Wellness · Wellness travel and spiritual experiences in Sri Lanka</p><p>For the full journey there may be a final human review of availability, supplier terms and approved plans before any payment or booking confirmation is made.</p><p>Contact: +48 696 741 450 · hello@ceylonwellness.com</p></div></div></body></html>`; const win=window.open('', '_blank','noopener,noreferrer'); if(!win){setNotice('Please allow pop-ups to download the traveller PDF.');return;} win.document.write(html); win.document.close(); setTimeout(()=>{win.focus(); win.print();},300);};
const travelMsg=selected?`Ceylon Wellness · Traveller request
Name: ${selected.name||'Traveller'}
Journey ref: ${selected.journey_ref||'—'}
Travel dates: ${selected.travel_dates||'TBC'}
Travellers: ${selected.travellers||'—'}
Language: ${selected.preferred_language||'—'}
Contact: ${selected.whatsapp||selected.email||'—'}

Full journey details are available in Ceylon Wellness Admin.`:'';const reikiMsg=selectedReiki?`Ceylon Wellness · Online Reiki request
Name: ${selectedReiki.name||'Client'}
Request ref: ${selectedReiki.request_ref||'—'}
Language: ${selectedReiki.preferred_language||'—'}
Reiki: ${selectedReiki.reiki_level||'TBC'}
Contact: ${selectedReiki.whatsapp||selectedReiki.email||'—'}

Full request details are available in Ceylon Wellness Admin.`:'';
return (
  <main className="page adminPage"><div className="adminBar"><div><span className="eyebrow">V9 · CEYLON WELLNESS OS · {role||'ADMIN'}</span><h1>Full Admin Control</h1></div><div className="adminBarActions"><button className="outlineBtn" onClick={load}><RefreshCw/> Refresh</button><button className="outlineBtn" onClick={()=>supabase?.auth.signOut()}><LogOut/> Sign out</button></div></div>
  <div className="adminV9Tabs"><button className={tab==='travel'?'button':'outlineBtn'} onClick={()=>{setTab('travel');setQuery('');}}>Travel Journeys <span>{leads.filter(x=>!x.deleted_at).length}</span></button><button className={tab==='reiki'?'button':'outlineBtn'} onClick={()=>{setTab('reiki');setQuery('');}}>Online Reiki <span>{reiki.filter(x=>!x.deleted_at).length}</span></button><button className={showTrash?'button':'outlineBtn'} onClick={()=>{setShowTrash(!showTrash);setSelected(null);setSelectedReiki(null);}}><Trash2/> {showTrash?'Viewing Trash':'Trash'}</button></div>
  <div className="adminSearch"><Search/><input placeholder={tab==='travel'?'Search name, email, WhatsApp or journey ref':'Search Reiki client, email, WhatsApp or request ref'} value={query} onChange={e=>setQuery(e.target.value)}/></div>{notice&&<p className="adminNotice">{notice}</p>}{showTrash&&<div className="trashBulkBar"><div className="trashBulkMeta"><input type="checkbox" checked={tab==='travel'?travelFiltered.length>0&&travelFiltered.every(x=>trashSelection.includes(x.id)):reikiFiltered.length>0&&reikiFiltered.every(x=>trashSelection.includes(x.id))} onChange={()=>selectAllVisible()} /> <span>{trashSelection.length} selected</span></div><div className="adminBarActions"><button className="outlineBtn" onClick={restoreSelected}><RotateCcw/> Restore selected</button>{role==='SUPER_ADMIN'&&<button className="dangerBtn" onClick={openPermanentDeleteSelected}><Trash2/> Delete forever</button>}<button className="outlineBtn" onClick={clearTrashSelection}>Clear</button></div></div>}
  <div className="adminLayout"><section className="leadList">{loading&&<p>Loading…</p>}{tab==='travel'?travelFiltered.map(x=><div key={x.id} className={`leadCardWrap ${selected?.id===x.id?'selected':''}`}><input type="checkbox" className="trashCheckbox" checked={trashSelection.includes(x.id)} onChange={()=>toggleTrashSelection(x.id)} hidden={!showTrash} /><button className={`leadCard ${selected?.id===x.id?'selected':''}`} onClick={()=>openTravel(x)}>{showTrash && <span className="leadCardCheck" aria-hidden="true">✓</span>}<div><b>{x.name||'Traveller'}</b><span>{x.journey_ref||'No reference'} · {x.preferred_language||'—'}</span></div><small>{x.travel_dates||'Dates TBC'}</small><span className="statusPill">{x.status}</span></button></div>):reikiFiltered.map(x=><div key={x.id} className={`leadCardWrap ${selectedReiki?.id===x.id?'selected':''}`}><input type="checkbox" className="trashCheckbox" checked={trashSelection.includes(x.id)} onChange={()=>toggleTrashSelection(x.id)} hidden={!showTrash} /><button className={`leadCard ${selectedReiki?.id===x.id?'selected':''}`} onClick={()=>openReiki(x)}>{showTrash && <span className="leadCardCheck" aria-hidden="true">✓</span>}<div><b>{x.name||'Reiki client'}</b><span>{x.request_ref||'No reference'} · {x.preferred_language||'—'}</span></div><small>{x.reiki_level||'Level TBC'}</small><span className="statusPill">{x.status}</span></button></div>)}{!loading&&((tab==='travel'&&!travelFiltered.length)||(tab==='reiki'&&!reikiFiltered.length))&&<p>{showTrash?'Trash is empty.':'No requests yet.'}</p>}</section>
  <section className="leadDetail">
    {tab==='travel'&&selected&&draft ? (
      <>
        <div className="detailHead"><div><span className="eyebrow">{selected.journey_ref}</span><h2>{selected.name||'Traveller'}</h2></div><select value={selected.status} disabled={showTrash} onChange={e=>updateStatus('travel',selected.id,e.target.value)}>{LEAD_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div className="adminBarActions" style={{marginBottom:'1rem'}}>{!showTrash&&<><button className="outlineBtn" onClick={()=>setEditing(!editing)}><Pencil/> {editing?'Cancel edit':'Edit'}</button><button className="outlineBtn" onClick={()=>openSoftDelete('travel',selected.id,selected.name||'Traveller',selected.journey_ref||'Journey')}><Trash2/> Delete</button></>}{showTrash&&<><button className="outlineBtn" onClick={()=>restore('travel',selected.id)}><RotateCcw/> Restore</button>{role==='SUPER_ADMIN'&&<button className="dangerBtn" onClick={()=>openPermanentDelete('travel',selected.id,selected.name||'Traveller',selected.journey_ref||'Journey')}><Trash2/> Delete forever</button>}</>}</div>
        {editing ? (
          <div className="adminEditGrid">
            <div className="editorSection editorSection--traveller">
              <div className="editorSectionHeader">
                <h3>Traveller Details</h3>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField"><span>Name</span><input value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
                <label className="editorField"><span>Email</span><input value={draft.email||''} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>
                <label className="editorField"><span>WhatsApp</span><input value={draft.whatsapp||''} onChange={e=>setDraft({...draft,whatsapp:e.target.value})}/></label>
                <label className="editorField"><span>Preferred language</span><input list="admin-travel-language-options" value={draft.preferred_language||''} onChange={e=>setDraft({...draft,preferred_language:e.target.value})} placeholder="Select or type a language"/><datalist id="admin-travel-language-options">{ADMIN_LANGUAGE_SUGGESTIONS.map(x=><option key={x} value={x}/>)}</datalist></label>
                <label className="editorField"><span>Travellers</span><input type="number" min="1" value={draft.travellers||1} onChange={e=>setDraft({...draft,travellers:Number(e.target.value)})}/></label>
                <label className="editorField"><span>Travel dates</span><input value={draft.travel_dates||''} onChange={e=>setDraft({...draft,travel_dates:e.target.value})}/></label>
              </div>
            </div>

            <div className="editorSection editorSection--arrival">
              <div className="editorSectionHeader">
                <h3>Travel & Arrival</h3>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField"><span>Arrival airport</span><input value={draft.arrival_airport||''} onChange={e=>setDraft({...draft,arrival_airport:e.target.value})}/></label>
                <label className="editorField"><span>Flight number</span><input value={draft.flight_number||''} onChange={e=>setDraft({...draft,flight_number:e.target.value})}/></label>
                <label className="editorField"><span>Landing time</span><input value={draft.landing_time||''} onChange={e=>setDraft({...draft,landing_time:e.target.value})}/></label>
                <label className="editorField"><span>Airport pickup</span><input value={draft.airport_pickup||''} onChange={e=>setDraft({...draft,airport_pickup:e.target.value})}/></label>
              </div>
            </div>

            <div className="editorSection editorSection--preferences">
              <div className="editorSectionHeader">
                <h3>Journey Preferences</h3>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField"><span>Wellness / journey style</span><input value={draft.journey_style||''} onChange={e=>setDraft({...draft,journey_style:e.target.value})}/></label>
                <label className="editorField"><span>Accommodation</span><input value={draft.accommodation||''} onChange={e=>setDraft({...draft,accommodation:e.target.value})}/></label>
                <label className="editorField"><span>Transport</span><input value={draft.transport||''} onChange={e=>setDraft({...draft,transport:e.target.value})}/></label>
                <label className="editorField"><span>Budget</span><input value={draft.budget_range||''} onChange={e=>setDraft({...draft,budget_range:e.target.value})}/></label>
              </div>
              <label className="editorField editorField--full"><span>Trip requirements</span><textarea value={draft.requirements||''} onChange={e=>setDraft({...draft,requirements:e.target.value})}/></label>
            </div>

            <div className="editorSection editorSection--itinerary">
              <div className="editorSectionHeader">
                <h3>Day-by-Day Journey</h3>
              </div>
              <div className="itineraryEditor">
                {(draft.itinerary||[]).map((day,idx)=><div key={`${day.day}-${idx}`} className="itineraryDayCard">
                  <div className="itineraryCardHeader">
                    <span className="itineraryDayLabel">DAY {day.day || idx + 1}</span>
                    <button type="button" className="editorRemoveBtn" onClick={()=>removeDay(idx)}><Trash2/> Remove</button>
                  </div>
                  <div className="itineraryFieldGrid">
                    <label className="editorField editorField--full"><span>Location</span><input value={day.place||''} onChange={e=>changeDay(idx,'place',e.target.value)}/></label>
                    <label className="editorField editorField--full"><span>Wellness Focus</span><input value={day.focus||''} onChange={e=>changeDay(idx,'focus',e.target.value)}/></label>
                    <label className="editorField editorField--full"><span>Activity / Plan</span><textarea value={day.activity||''} onChange={e=>changeDay(idx,'activity',e.target.value)}/></label>
                    <label className="editorField editorField--full"><span>Stay / Hotel</span><input value={day.stay||''} onChange={e=>changeDay(idx,'stay',e.target.value)}/></label>
                    <label className="editorField editorField--full"><span>Notes</span><textarea value={day.notes||''} onChange={e=>changeDay(idx,'notes',e.target.value)}/></label>
                  </div>
                </div>)}
                <button type="button" className="addDayBtn" onClick={addDay}><Plus/> Add day</button>
              </div>
            </div>

            <div className="editorSection editorSection--pricing">
              <div className="editorSectionHeader">
                <h3>Price & Payment</h3>
              </div>
              <div className="priceSummaryGrid" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'0.75rem',marginBottom:'1rem'}}>
                <div className="editorStatCard"><span className="eyebrow">TOTAL JOURNEY</span><strong>{formatMoney(draft.total_price, draft.currency || 'USD')}</strong></div>
                <div className="editorStatCard"><span className="eyebrow">PAY NOW</span><strong>{formatMoney(getAdvanceSummary(draft).advanceAmount, draft.currency || 'USD')}</strong></div>
                <div className="editorStatCard"><span className="eyebrow">REMAINING</span><strong>{formatMoney(getAdvanceSummary(draft).remainingBalance, draft.currency || 'USD')}</strong></div>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField"><span>Currency</span><select value={draft.currency||''} onChange={e=>setDraft({...draft,currency:e.target.value||null})}><option value="">Select currency</option>{CURRENCY_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
                <label className="editorField"><span>Total Journey Price</span><input type="number" value={draft.total_price ?? ''} onChange={e=>setDraft({...draft,total_price:e.target.value === '' ? null : Number(e.target.value)})}/></label>
                <label className="editorField"><span>Deposit Type</span><select value={draft.advance_deposit_type || 'percentage'} onChange={e=>setDraft({...draft,advance_deposit_type:e.target.value})}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option></select></label>
                <label className="editorField"><span>Deposit Value</span><input type="number" value={draft.advance_deposit_value ?? ''} onChange={e=>setDraft({...draft,advance_deposit_value:e.target.value === '' ? null : Number(e.target.value)})}/></label>
                <label className="editorField"><span>Advance Amount</span><input type="number" value={getAdvanceSummary(draft).advanceAmount ?? 0} readOnly/></label>
                <label className="editorField"><span>Remaining Balance</span><input type="number" value={getAdvanceSummary(draft).remainingBalance ?? 0} readOnly/></label>
              </div>
            </div>

            <div className="editorSection editorSection--booking">
              <div className="editorSectionHeader">
                <h3>Booking Summary</h3>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField"><span>Accommodation</span><select value={draft.accommodation_booking_status || 'Pending'} onChange={e=>setDraft({...draft,accommodation_booking_status:e.target.value})}>{BOOKING_ITEM_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
                <label className="editorField"><span>Transport</span><select value={draft.transport_booking_status || 'Pending'} onChange={e=>setDraft({...draft,transport_booking_status:e.target.value})}>{BOOKING_ITEM_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
                <label className="editorField editorField--full"><span>Wellness / Activities</span><select value={draft.wellness_booking_status || 'Pending'} onChange={e=>setDraft({...draft,wellness_booking_status:e.target.value})}>{BOOKING_ITEM_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
                {draft.accommodation_booking_details && <label className="editorField editorField--full"><span>Accommodation booking details</span><textarea value={draft.accommodation_booking_details || ''} onChange={e=>setDraft({...draft,accommodation_booking_details:e.target.value})}/></label>}
                {draft.transport_booking_details && <label className="editorField editorField--full"><span>Transport booking details</span><textarea value={draft.transport_booking_details || ''} onChange={e=>setDraft({...draft,transport_booking_details:e.target.value})}/></label>}
                {draft.wellness_booking_details && <label className="editorField editorField--full"><span>Wellness booking details</span><textarea value={draft.wellness_booking_details || ''} onChange={e=>setDraft({...draft,wellness_booking_details:e.target.value})}/></label>}
              </div>
            </div>

            <div className="editorSection editorSection--terms">
              <div className="editorSectionHeader">
                <h3>Traveller Terms</h3>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField editorField--full"><span>What's included</span><textarea value={draft.price_includes || ''} onChange={e=>setDraft({...draft,price_includes:e.target.value})}/></label>
                <label className="editorField editorField--full"><span>What's not included</span><textarea value={draft.price_excludes || ''} onChange={e=>setDraft({...draft,price_excludes:e.target.value})}/></label>
                <label className="editorField editorField--full"><span>Payment instructions</span><textarea value={draft.traveller_payment_instructions || ''} onChange={e=>setDraft({...draft,traveller_payment_instructions:e.target.value})}/></label>
                <label className="editorField editorField--full"><span>Cancellation / refund terms</span><textarea value={draft.traveller_cancellation_terms || ''} onChange={e=>setDraft({...draft,traveller_cancellation_terms:e.target.value})}/></label>
              </div>
            </div>

            <div className="editorSection editorSection--internal">
              <div className="editorSectionHeader">
                <h3>Internal / Advanced</h3>
                <button type="button" className="outlineBtn" onClick={()=>setShowInternalAdvanced(!showInternalAdvanced)}>{showInternalAdvanced ? 'Hide' : 'Show'}</button>
              </div>
              {!showInternalAdvanced ? (
                <div className="editorPrivateNote">PRIVATE — NEVER SHOWN TO TRAVELLER</div>
              ) : (
                <div className="editorFieldGrid editorFieldGrid--two">
                  <label className="editorField"><span>Supplier cost</span><input type="number" value={draft.supplier_cost ?? ''} onChange={e=>setDraft({...draft,supplier_cost:e.target.value === '' ? null : Number(e.target.value)})}/></label>
                  <label className="editorField"><span>Supplier reference</span><input value={draft.supplier_reference || ''} onChange={e=>setDraft({...draft,supplier_reference:e.target.value})}/></label>
                  <label className="editorField"><span>Internal margin</span><input type="number" value={draft.internal_margin ?? ''} onChange={e=>setDraft({...draft,internal_margin:e.target.value === '' ? null : Number(e.target.value)})}/></label>
                  <label className="editorField"><span>Booking status</span><select value={draft.booking_status || 'DRAFT'} onChange={e=>setDraft({...draft,booking_status:e.target.value})}>{FINAL_BOOKING_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
                  <label className="editorField"><span>Advance due date</span><input value={draft.advance_due_date || ''} onChange={e=>setDraft({...draft,advance_due_date:e.target.value})}/></label>
                  <label className="editorField"><span>Balance due date</span><input value={draft.balance_due_date || ''} onChange={e=>setDraft({...draft,balance_due_date:e.target.value})}/></label>
                  <label className="editorField"><span>Quotation valid until</span><input value={draft.quotation_valid_until || ''} onChange={e=>setDraft({...draft,quotation_valid_until:e.target.value})}/></label>
                  <label className="editorField editorField--full"><span>Internal commercial notes</span><textarea value={draft.internal_commercial_notes || ''} onChange={e=>setDraft({...draft,internal_commercial_notes:e.target.value})}/></label>
                  <label className="editorField editorField--full"><span>Internal admin notes</span><textarea value={draft.admin_notes||''} onChange={e=>setDraft({...draft,admin_notes:e.target.value})}/></label>
                </div>
              )}
            </div>

            <div className="editorSection editorSection--review">
              <div className="editorSectionHeader">
                <h3>Final Journey Review</h3>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField"><span>Journey reference</span><input value={draft.journey_ref || ''} onChange={e=>setDraft({...draft,journey_ref:e.target.value})}/></label>
                <label className="editorField"><span>Delivery preference</span><input value={draft.delivery_preference || ''} onChange={e=>setDraft({...draft,delivery_preference:e.target.value})}/></label>
                <label className="editorField editorField--full"><span>Traveller summary</span><textarea readOnly value={`${draft.name||'Traveller'} · ${draft.travel_dates||'Dates TBC'} · ${draft.travellers||'1'} travellers · ${draft.accommodation||'Stay TBC'} · ${draft.transport||'Transport TBC'}`}/></label>
              </div>
            </div>

            <div className="editorSection editorSection--finalise">
              <div className="editorSectionHeader">
                <h3>Finalise Journey</h3>
              </div>
              <div className="adminBarActions" style={{marginTop:'0.5rem'}}>
                <button type="button" className="button" onClick={()=>{setJourneyFinalised(true);setNotice('Journey finalised. Delivery actions are ready.');}}><CheckCircle2/> Finalise Journey</button>
                <a className="outlineBtn" href={wa(travelMsg)} target="_blank"><MessageCircle/> WhatsApp</a>
                <a className="outlineBtn" href={emailLink(selected.email,`Ceylon Wellness · ${selected.journey_ref||'Journey'}`,travelMsg)}><Mail/> Email</a>
                <button className="outlineBtn" type="button" onClick={saveAndDownloadPdf}><Download/> Save &amp; Download PDF</button>
              </div>
            </div>

            <div className="editorActionBar">
              <button type="button" className="outlineBtn" onClick={()=>setEditing(false)}><Pencil/> Cancel edit</button>
              <button type="button" className="button" onClick={saveLead}><CheckCircle2/> Save all changes</button>
            </div>
          </div>
        ) : (
          <div className="detailGrid">
            <article><Mail/><b>{selected.email||'No email'}</b><span>{selected.preferred_language||'Language TBC'}</span></article>
            <article><Phone/><b>{selected.whatsapp||'No WhatsApp'}</b><span>{selected.travel_dates||'Dates TBC'}</span></article>
            <article><Users/><b>{selected.travellers||1} travellers</b><span>{selected.arrival_airport||'Airport TBC'}</span></article>
            <article><Plane/><b>{selected.flight_number||'Flight TBC'}</b><span>{selected.airport_pickup||'Pickup TBC'}</span></article>
            <article><Heart/><b>{selected.journey_style||'Style TBC'}</b><span>{selected.accommodation||'Stay TBC'}</span></article>
            <article><MapPin/><b>{selected.transport||'Transport TBC'}</b><span>{selected.budget_range||'Budget TBC'}</span></article>
            <article style={{gridColumn:'1 / -1'}}><FileText/><b>Requirements</b><span>{selected.requirements||'No notes yet'}</span></article>
            {selected.admin_notes && <article style={{gridColumn:'1 / -1'}}><Settings2/><b>Internal admin notes</b><span>{selected.admin_notes}</span></article>}
            {(selected.itinerary||[]).length > 0 && <div style={{gridColumn:'1 / -1'}} className="itinerarySummary"><h3>Day-by-day plan</h3>{(selected.itinerary||[]).map(day=><div key={`${selected.id}-${day.day}`} className="itineraryRow"><b>Day {day.day}</b><span>{day.place||'TBC'} · {day.focus||'Focus TBC'}</span><small>{day.activity||'Activity TBC'}</small></div>)}</div>}
          </div>
        )}
      </>
    ) : tab==='reiki'&&selectedReiki&&reikiDraft ? (
      <>
        <div className="detailHead"><div><span className="eyebrow">{selectedReiki.request_ref}</span><h2>{selectedReiki.name||'Reiki client'}</h2></div><select value={selectedReiki.status} disabled={showTrash} onChange={e=>updateStatus('reiki',selectedReiki.id,e.target.value)}>{REIKI_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div className="adminBarActions" style={{marginBottom:'1rem'}}>{!showTrash&&<><button className="outlineBtn" onClick={()=>setEditing(!editing)}><Pencil/> {editing?'Cancel edit':'Edit'}</button><a className="outlineBtn" href={wa(reikiMsg)} target="_blank"><MessageCircle/> WhatsApp</a><a className="outlineBtn" href={emailLink(selectedReiki.email,`Ceylon Wellness · Online Reiki · ${selectedReiki.request_ref||''}`,reikiMsg)}><Mail/> Email</a><button className="outlineBtn" onClick={()=>openSoftDelete('reiki',selectedReiki.id,selectedReiki.name||'Reiki client',selectedReiki.request_ref||'Request')}><Trash2/> Delete</button></>}{showTrash&&<><button className="outlineBtn" onClick={()=>restore('reiki',selectedReiki.id)}><RotateCcw/> Restore</button>{role==='SUPER_ADMIN'&&<button className="dangerBtn" onClick={()=>openPermanentDelete('reiki',selectedReiki.id,selectedReiki.name||'Reiki client',selectedReiki.request_ref||'Request')}><Trash2/> Delete forever</button>}</>}</div>
        {editing ? (
          <div className="adminEditGrid">
            <div className="editorSection">
              <div className="editorSectionHeader">
                <h3>Client Details</h3>
              </div>
              <div className="editorFieldGrid editorFieldGrid--two">
                <label className="editorField"><span>Name</span><input value={reikiDraft.name||''} onChange={e=>setReikiDraft({...reikiDraft,name:e.target.value})}/></label>
                <label className="editorField"><span>Email</span><input value={reikiDraft.email||''} onChange={e=>setReikiDraft({...reikiDraft,email:e.target.value})}/></label>
                <label className="editorField"><span>WhatsApp</span><input value={reikiDraft.whatsapp||''} onChange={e=>setReikiDraft({...reikiDraft,whatsapp:e.target.value})}/></label>
                <label className="editorField"><span>Language</span><input list="admin-reiki-language-options" value={reikiDraft.preferred_language||''} onChange={e=>setReikiDraft({...reikiDraft,preferred_language:e.target.value})} placeholder="Select or type a language"/><datalist id="admin-reiki-language-options">{ADMIN_LANGUAGE_SUGGESTIONS.map(x=><option key={x} value={x}/>)}</datalist></label>
                <label className="editorField"><span>Reiki level</span><input value={reikiDraft.reiki_level||''} onChange={e=>setReikiDraft({...reikiDraft,reiki_level:e.target.value})}/></label>
                <label className="editorField"><span>Timezone</span><input value={reikiDraft.timezone||''} onChange={e=>setReikiDraft({...reikiDraft,timezone:e.target.value})}/></label>
                <label className="editorField editorField--full"><span>Preferred schedule</span><input value={reikiDraft.preferred_schedule||''} onChange={e=>setReikiDraft({...reikiDraft,preferred_schedule:e.target.value})}/></label>
              </div>
            </div>

            <div className="editorSection">
              <div className="editorSectionHeader">
                <h3>Client Notes</h3>
              </div>
              <label className="editorField editorField--full"><span>Client notes</span><textarea value={reikiDraft.notes||''} onChange={e=>setReikiDraft({...reikiDraft,notes:e.target.value})}/></label>
            </div>

            <div className="editorSection">
              <div className="editorSectionHeader">
                <h3>Internal Admin Notes</h3>
                <span className="editorPrivateNote">Private — not visible to the traveller</span>
              </div>
              <label className="editorField editorField--full"><span>Internal Admin Notes</span><textarea value={reikiDraft.admin_notes||''} onChange={e=>setReikiDraft({...reikiDraft,admin_notes:e.target.value})}/></label>
            </div>

            <div className="editorActionBar">
              <button type="button" className="outlineBtn" onClick={()=>setEditing(false)}><Pencil/> Cancel edit</button>
              <button type="button" className="button" onClick={saveReiki}><CheckCircle2/> Save all changes</button>
            </div>
          </div>
        ) : (
          <div className="detailGrid">
            <article><Mail/><b>{selectedReiki.email||'No email'}</b><span>{selectedReiki.preferred_language||'Language TBC'}</span></article>
            <article><Phone/><b>{selectedReiki.whatsapp||'No WhatsApp'}</b><span>{selectedReiki.timezone||'Timezone TBC'}</span></article>
            <article><Sparkles/><b>{selectedReiki.reiki_level||'Level TBC'}</b><span>{selectedReiki.preferred_schedule||'Schedule TBC'}</span></article>
            <article style={{gridColumn:'1 / -1'}}><FileText/><b>Client notes</b><span>{selectedReiki.notes||'No notes yet'}</span></article>
            {selectedReiki.admin_notes && <article style={{gridColumn:'1 / -1'}}><Settings2/><b>Internal admin notes</b><span>{selectedReiki.admin_notes}</span></article>}
          </div>
        )}
      </>
    ) : (
      <div className="emptyDetail"><UserRound/><h2>Select a {tab==='travel'?'traveller':'Reiki client'}</h2><p>Open a card to review and manage the complete record.</p></div>
    )}
  </section>
  </div>
  {deleteModal && (
    <div className="adminModalBackdrop" onClick={()=>setDeleteModal(null)}>
      <div className="adminModal" onClick={e=>e.stopPropagation()}>
        <div className="adminModalHeader">
          <span className="eyebrow">DELETE · {deleteModal.mode==='soft'?'TRASH':'PERMANENT DELETE'}</span>
          <button type="button" className="closeModalBtn" onClick={()=>setDeleteModal(null)}>×</button>
        </div>
        {deleteModal.mode==='soft' ? (
          <>
            <h3>Move this journey to Trash?</h3>
            <p className="adminModalBody">This is a soft delete. It can be restored later from the Trash view.</p>
            <div className="adminModalActions">
              <button type="button" className="outlineBtn" onClick={()=>setDeleteModal(null)}>Cancel</button>
              <button type="button" className="dangerBtn" onClick={confirmSoftDelete}>Move to Trash</button>
            </div>
          </>
        ) : (
          <>
            <h3>Permanently delete {deleteModal.reference} — {deleteModal.name}?</h3>
            <p className="adminModalBody">This cannot be undone. The record and associated data will be removed from the system immediately.</p>
            <label className="editorField adminModalField">
              <span>Delete reason</span>
              <select value={deleteModal.reason} onChange={e=>setDeleteModal({...deleteModal,reason:e.target.value})}>
                {DELETE_REASON_OPTIONS.map(option=><option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            {deleteModal.reason==='Other' && <label className="editorField adminModalField"><span>Add reason</span><input value={deleteModal.customReason} onChange={e=>setDeleteModal({...deleteModal,customReason:e.target.value})} placeholder="Add reason" /></label>}
            <div className="adminModalActions">
              <button type="button" className="outlineBtn" onClick={()=>setDeleteModal(null)}>Cancel</button>
              <button type="button" className="dangerBtn" onClick={confirmPermanentDelete}>Delete forever</button>
            </div>
          </>
        )}
      </div>
    </div>
  )}
  </main>
);
}
export default function App(){const [lang,setLang]=useState<Lang>('EN');const wrap=(x:React.ReactNode)=><Shell lang={lang} setLang={setLang}>{x}</Shell>;return <Routes><Route path="/" element={wrap(<Home lang={lang}/>)}/><Route path="/ask-ceylon" element={wrap(<AskCeylon lang={lang}/>)}/><Route path="/design-your-journey" element={wrap(<AskCeylon lang={lang}/>)}/><Route path="/reiki" element={wrap(<Reiki/>)}/><Route path="/dr-vipula" element={wrap(<Vipula/>)}/><Route path="/wellness" element={wrap(<Simple lang={lang} title="Wellness, designed around you."/>)}/><Route path="/sri-lanka" element={wrap(<Simple lang={lang} title="Sri Lanka, experienced with intention."/>)}/><Route path="/about" element={wrap(<Simple lang={lang} title="Founder-managed. Human-centred."/>)}/><Route path="/privacy" element={wrap(<Privacy/>)}/><Route path="/admin" element={<AdminWorkspace/>}/><Route path="/terms" element={wrap(<Legal title="Terms & Conditions"/>)}/><Route path="*" element={wrap(<Simple lang={lang} title="Page not found"/>)}/></Routes>}


