window.DEEPL_PROXY_URL = window.DEEPL_PROXY_URL || 'https://busan-sea-care-translate.lucas-j-hwang10.workers.dev/';

const home = document.querySelector('#home-screen');
const emergency = document.querySelector('#emergency-screen');
const marine = document.querySelector('#marine-screen');
const facility = document.querySelector('#facility-screen');
const smsScreen = document.querySelector('#sms-screen');
const shell = document.querySelector('.app-shell');
let selectedSituation = '';
let selectedSituationKey = '';
let locationText = 'Haeundae Beach, Busan (location unavailable)';
let currentLanguage = 'en';

shell.append(marine, facility, smsScreen);
const screens = [home, emergency, marine, facility, smsScreen];
const activate = (screen) => { screens.forEach((item) => item.classList.remove('active')); screen.classList.add('active'); };
const showHome = () => activate(home);
const showEmergency = () => activate(emergency);
const showMarine = () => activate(marine);
const showFacilities = () => {
  activate(facility);
  window.requestAnimationFrame(() => window.busanNearbyMap?.invalidateSize());
};

const conditionsCard = document.querySelector('.conditions');
conditionsCard.setAttribute('role', 'button');
conditionsCard.setAttribute('tabindex', '0');
conditionsCard.setAttribute('aria-label', 'Open detailed marine information');
conditionsCard.addEventListener('click', showMarine);
conditionsCard.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') showMarine(); });
document.querySelector('nav').remove();
document.querySelector('#report-button').addEventListener('click', showEmergency);
const facilitiesCard = document.querySelector('.facilities');
facilitiesCard.setAttribute('role', 'button');
facilitiesCard.setAttribute('tabindex', '0');
facilitiesCard.setAttribute('aria-label', 'Open nearby facilities map');
facilitiesCard.addEventListener('click', showFacilities);
facilitiesCard.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') showFacilities(); });
document.querySelector('#back-button').addEventListener('click', showHome);
document.querySelector('#cancel-button').addEventListener('click', showHome);
document.querySelector('#marine-back-button').addEventListener('click', showHome);
document.querySelector('#facility-back-button').addEventListener('click', showHome);
document.querySelector('#sms-back-button').addEventListener('click', showEmergency);

const translationPanelTemplate = document.createElement('section');
translationPanelTemplate.id = 'translation-panel';
translationPanelTemplate.className = 'translation-panel';
translationPanelTemplate.hidden = true;
translationPanelTemplate.innerHTML = '<label for="translation-input">Add a short detail (optional)</label><textarea id="translation-input" rows="2" maxlength="280" placeholder="Example: I cannot find my family and need help."></textarea><small id="translation-status" aria-live="polite"></small>';
document.querySelector('.agency-list').before(translationPanelTemplate);
const deliveryPreviewTemplate = document.createElement('section');
deliveryPreviewTemplate.className = 'delivery-preview';
deliveryPreviewTemplate.hidden = true;
deliveryPreviewTemplate.innerHTML = '<span>Message to be delivered (Korean)</span><p id="delivery-message"></p>';
document.querySelector('.agency-list').before(deliveryPreviewTemplate);

const buildReport = () => {
  const reportTemplates = { en: `I am at ${locationText} and I am facing ${selectedSituation}. Please send help.`, ko: `저는 ${locationText}에 있고 ${selectedSituation} 상황에 처해 있습니다. 도움을 보내주세요.`, zh: `我在${locationText}，正面临${selectedSituation}。请提供帮助。`, ja: `私は${locationText}にいて、${selectedSituation}の状況にあります。助けを送ってください。`, es: `Estoy en ${locationText} y me enfrento a ${selectedSituation}. Por favor, envíen ayuda.` };
  const message = reportTemplates[currentLanguage];
  const koreanSituations = {
    'a marine accident or drifting situation': '해양 사고 또는 표류 상황',
    'a missing person situation': '실종자 상황',
    'a medical emergency': '의료 응급상황',
    'a safety threat or crime': '안전 위협 또는 범죄 상황',
    'a fire or dangerous smoke situation': '화재 또는 위험한 연기 상황',
    'another emergency situation': '기타 응급상황'
  };
  const koreanMessage = `저는 ${locationText}에 있고 ${koreanSituations[selectedSituationKey] || '응급상황'}에 처해 있습니다. 도움을 보내주세요.`;
  document.querySelector('#gps-location').textContent = locationText;
  document.querySelector('#report-message').textContent = message;
  const smsLink = document.querySelector('#sms-link');
  const translationPanel = document.querySelector('#translation-panel');
  const translationInput = document.querySelector('#translation-input');
  const translationStatus = document.querySelector('#translation-status');
  const deliveryPreview = document.querySelector('.delivery-preview');
  const deliveryMessage = document.querySelector('#delivery-message');
  let translatedDetail = '';
  let translationTimer;
  const refreshMessage = () => {
    const sourceDetail = translationInput.value.trim() ? `\n\nAdditional details: ${translationInput.value.trim()}` : '';
    const koreanDetail = translatedDetail ? `\n\n추가 설명: ${translatedDetail}` : '';
    document.querySelector('#report-message').textContent = `${message}${sourceDetail}`;
    deliveryMessage.textContent = `${koreanMessage}${koreanDetail}`;
    smsLink.dataset.message = `${document.querySelector('.agency-button.selected')?.dataset.agency || 'Emergency'} report: ${koreanMessage}${koreanDetail}`;
  };
  const translateWithDeepL = async (text) => {
    if (!text.trim()) { translatedDetail = ''; translationStatus.textContent = ''; refreshMessage(); return; }
    translationStatus.textContent = 'Translating to Korean…';
    try {
      if (!window.DEEPL_PROXY_URL) throw new Error('DeepL proxy is not configured');
      const response = await fetch(window.DEEPL_PROXY_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_lang: 'KO' })
      });
      if (!response.ok) throw new Error('Translation request failed');
      const data = await response.json();
      translatedDetail = data.translation || data.translations?.[0]?.text || '';
      translationStatus.textContent = translatedDetail ? 'Translated to Korean with DeepL' : 'Translation unavailable';
    } catch {
      translatedDetail = text;
      translationStatus.textContent = 'DeepL connection is needed for Korean translation';
    }
    refreshMessage();
  };
  translationPanel.hidden = false;
  deliveryPreview.hidden = false;
  translationInput.value = '';
  translationStatus.textContent = '';
  translationInput.oninput = () => {
    clearTimeout(translationTimer);
    translationTimer = setTimeout(() => translateWithDeepL(translationInput.value), 500);
  };
  smsLink.textContent = 'Send message (demo)';
  document.querySelector('#sent-confirmation').hidden = true;
  const chooseAgency = (button) => {
    document.querySelectorAll('.agency-button').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    refreshMessage();
  };
  document.querySelectorAll('.agency-button').forEach((button) => button.onclick = () => chooseAgency(button));
  chooseAgency(document.querySelector('.agency-button'));
  smsLink.onclick = () => { document.querySelector('#sent-confirmation').hidden = false; smsLink.textContent = 'Message sent (demo)'; };
};
const locateAndReport = () => {
  const openReport = () => { buildReport(); activate(smsScreen); };
  if (!navigator.geolocation) return openReport();
  navigator.geolocation.getCurrentPosition((position) => {
    locationText = `GPS ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
    openReport();
  }, openReport, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
};
document.querySelectorAll('.situation-card').forEach((button) => button.addEventListener('click', () => { selectedSituation = button.querySelector('span').textContent; selectedSituationKey = button.dataset.situation; locateAndReport(); }));

const placeName = document.querySelector('#place-name');
const placeKind = document.querySelector('#place-kind');
const placeDistance = document.querySelector('#place-distance');
document.querySelectorAll('.map-pin').forEach((pin) => pin.addEventListener('click', () => { placeName.textContent = pin.dataset.name; placeKind.textContent = pin.dataset.kind; placeDistance.textContent = 'Nearby - Open now'; }));
document.querySelectorAll('.filter').forEach((filter) => filter.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
  filter.classList.add('active');
  const selected = filter.dataset.type;
  document.querySelectorAll('.map-pin').forEach((pin) => { pin.hidden = selected !== 'All' && pin.dataset.kind !== selected; });
  if (window.updateNearbyMarkers) window.updateNearbyMarkers(selected);
}));

const mapPanel = document.querySelector('.map-panel');
if (window.L) {
  const mapHost = document.createElement('div');
  mapHost.id = 'nearby-map';
  mapPanel.replaceChildren(mapHost);
  const map = L.map(mapHost, { zoomControl: true, attributionControl: true }).setView([35.16125, 129.16080], 16);
  window.busanNearbyMap = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  const facilities = [
    { kind: 'Store', name: 'Convenience Store', icon: '▰', position: [35.16162, 129.15942] },
    { kind: 'Restroom', name: 'Public Restroom', icon: 'R', position: [35.16074, 129.16182] },
    { kind: 'Info', name: 'Tourist Information', icon: 'i', position: [35.16110, 129.15895] },
    { kind: 'Pharmacy', name: 'Pharmacy', icon: '+', position: [35.16228, 129.16150] },
    { kind: 'Locker', name: 'Luggage Locker', icon: 'L', position: [35.16186, 129.16078] },
    { kind: 'Charging', name: 'Phone Charging', icon: 'C', position: [35.16096, 129.16010] },
    { kind: 'Accessible', name: 'Wheelchair & Stroller Rental', icon: 'A', position: [35.16203, 129.16212] }
  ];
  const markerColor = { Store: '#21ad72', Restroom: '#147bd9', Info: '#8443d0', Pharmacy: '#ed5950', Locker: '#f2a828', Charging: '#9a55d5', Accessible: '#168f9e' };
  const markers = facilities.map((item) => {
    const marker = L.marker(item.position, { icon: L.divIcon({ className: 'facility-marker', html: `<span style="background:${markerColor[item.kind]}">${item.icon}</span>`, iconSize: [34, 34], iconAnchor: [17, 34] }) }).addTo(map);
    marker.bindTooltip(item.name, { direction: 'top', offset: [0, -30] });
    marker.on('click', () => { placeName.textContent = item.name; placeKind.textContent = item.kind; placeDistance.textContent = 'Nearby - Open now'; });
    return { ...item, marker };
  });
  L.circleMarker([35.16125, 129.16080], { radius: 8, fillColor: '#073967', color: '#fff', weight: 3, fillOpacity: 1 }).addTo(map).bindTooltip('Your location');
  window.updateNearbyMarkers = (kind) => markers.forEach((item) => {
    if (kind === 'All' || item.kind === kind) item.marker.addTo(map);
    else item.marker.remove();
  });
}

const translations = {
  en: { code: 'EN', report: 'REPORT', tagline: 'Stay safe by the sea', marine: 'Marine Conditions', facilities: 'Nearby Facilities', map: 'View Map', emergency: 'Emergency Call', situation: 'What is happening now?', sms: 'Send Emergency Report', choose: 'Choose the agency for this situation', send: 'Send message (demo)' },
  ko: { code: '한국어', report: '신고', tagline: '바다에서 안전하게', marine: '해양 정보', facilities: '주변 편의시설', map: '지도 보기', emergency: '긴급 신고', situation: '현재 어떤 상황인가요?', sms: '긴급 신고 보내기', choose: '신고 기관을 선택하세요', send: '문자 보내기 (데모)' },
  zh: { code: '中文', report: '报告', tagline: '安全享受海边时光', marine: '海洋信息', facilities: '附近设施', map: '查看地图', emergency: '紧急报告', situation: '您目前遇到了什么情况？', sms: '发送紧急报告', choose: '请选择服务机构', send: '发送信息（演示）' },
  ja: { code: '日本語', report: '通報', tagline: '海辺で安全に過ごす', marine: '海洋情報', facilities: '周辺施設', map: '地図を見る', emergency: '緊急通報', situation: '現在の状況を選んでください', sms: '緊急通報を送信', choose: '連絡先を選択してください', send: 'メッセージ送信（デモ）' },
  es: { code: 'Español', report: 'REPORTAR', tagline: 'Disfruta el mar con seguridad', marine: 'Condiciones marinas', facilities: 'Servicios cercanos', map: 'Ver mapa', emergency: 'Llamada de emergencia', situation: '¿Qué está ocurriendo?', sms: 'Enviar reporte de emergencia', choose: 'Elige el servicio adecuado', send: 'Enviar mensaje (demo)' }
};
const languageControl = document.createElement('div');
languageControl.className = 'language-control';
languageControl.innerHTML = '<button id="language-toggle" type="button" aria-label="Choose language">A/文 <span>EN</span></button><div id="language-menu" class="language-menu" hidden><button data-language="en">English</button><button data-language="ko">한국어</button><button data-language="zh">中文</button><button data-language="ja">日本語</button><button data-language="es">Español</button></div>';
document.querySelector('.hero').append(languageControl);
let applyLanguage = (language) => {
  const copy = translations[language];
  document.documentElement.lang = language;
  document.querySelector('#language-toggle span').textContent = copy.code;
  document.querySelector('#report-button span:nth-child(2)').textContent = copy.report;
  document.querySelector('.hero p').textContent = copy.tagline;
  document.querySelector('.conditions h2').textContent = copy.marine;
  document.querySelector('.facilities h2').textContent = copy.facilities;
  document.querySelector('.map-button').textContent = copy.map;
  document.querySelector('#emergency-screen h1').textContent = copy.emergency;
  document.querySelector('#emergency-screen .instruction').textContent = copy.situation;
  document.querySelector('#sms-screen h1').textContent = copy.sms;
  document.querySelector('#sms-screen .instruction').textContent = copy.choose;
  document.querySelector('#sms-link').textContent = copy.send;
  localStorage.setItem('busan-sea-care-language', language);
};
const detailedCopy = {
  en: ['Details', 'Sea temperature', 'Wave height', 'Water quality', 'Good', 'Convenience Store', 'Restroom', 'Information', 'Updated now', 'Air temperature', 'Sea temperature', 'Wave height', 'Partly cloudy', 'Comfortable', 'Low waves', 'More conditions', 'Wind', 'Tide', 'Visibility', 'UV index', 'Safety score', 'Today\'s caution', 'High UV index and tide change at 16:40', 'All', 'Store', 'Restroom', 'Info', 'Pharmacy', 'Locker', 'Charging', 'Accessible', 'Get directions', 'Marine accident', 'Missing person', 'Medical emergency', 'Safety threat', 'Fire or smoke', 'Other emergency', 'Select a situation to use your current location.', 'GPS location', 'Automatic message', 'Coast Guard', 'Marine emergencies', 'Police', 'Safety threats and crime', 'Fire & Ambulance', 'Fire and medical emergencies', 'Demo recipient: 010-2659-7174. No real message will be sent.', 'Message sent', 'Demo report delivered successfully.'],
  ko: ['상세 정보', '수온', '파도 높이', '수질', '좋음', '편의점', '화장실', '안내소', '방금 업데이트', '기온', '수온', '파도 높이', '구름 조금', '쾌적함', '잔잔한 파도', '추가 정보', '풍속', '조위', '시정', '자외선 지수', '안전 점수', '오늘의 주의사항', '자외선 지수가 높고 16:40에 조위가 변합니다', '전체', '편의점', '화장실', '안내소', '약국', '보관함', '충전', '접근성', '길찾기', '해양 사고', '실종자', '의료 응급상황', '안전 위협', '화재 또는 연기', '기타 응급상황', '상황을 선택하면 현재 위치를 사용합니다.', 'GPS 위치', '자동 생성 문장', '해양경찰', '해양 응급상황', '경찰', '범죄 및 안전 위협', '소방·구급', '화재 및 의료 응급상황', '데모 수신자: 010-2659-7174. 실제 문자는 전송되지 않습니다.', '메시지 전송 완료', '데모 신고가 성공적으로 전송되었습니다.'],
  zh: ['详细信息', '海水温度', '浪高', '水质', '良好', '便利店', '洗手间', '咨询处', '刚刚更新', '气温', '海水温度', '浪高', '局部多云', '舒适', '低浪', '更多状况', '风速', '潮位', '能见度', '紫外线指数', '安全评分', '今日注意事项', '紫外线指数较高，16:40 潮位变化', '全部', '商店', '洗手间', '咨询处', '药店', '行李寄存', '充电', '无障碍', '导航', '海上事故', '失踪人员', '医疗紧急情况', '安全威胁', '火灾或烟雾', '其他紧急情况', '选择情况后将使用您的当前位置。', 'GPS 位置', '自动生成的信息', '海岸警卫队', '海上紧急情况', '警察', '安全威胁和犯罪', '消防与救护', '火灾和医疗紧急情况', '演示接收人：010-2659-7174。不会发送真实信息。', '信息已发送', '演示报告已成功发送。'],
  ja: ['詳細情報', '海水温度', '波の高さ', '水質', '良好', 'コンビニ', 'トイレ', '案内所', 'たった今更新', '気温', '海水温度', '波の高さ', '晴れ時々曇り', '快適', '穏やかな波', '追加情報', '風速', '潮位', '視界', '紫外線指数', '安全スコア', '今日の注意事項', '紫外線指数が高く、16:40に潮位が変化します', 'すべて', '店舗', 'トイレ', '案内所', '薬局', 'ロッカー', '充電', 'バリアフリー', 'ルート案内', '海上事故', '行方不明者', '医療緊急事態', '安全上の脅威', '火災・煙', 'その他の緊急事態', '状況を選択すると現在地を使用します。', 'GPS位置', '自動メッセージ', '海上保安庁', '海上緊急事態', '警察', '犯罪・安全上の脅威', '消防・救急', '火災・医療緊急事態', 'デモ宛先：010-2659-7174。実際の送信はされません。', 'メッセージ送信済み', 'デモ通報が送信されました。'],
  es: ['Detalles', 'Temperatura del mar', 'Altura de ola', 'Calidad del agua', 'Buena', 'Tienda', 'Baño', 'Información', 'Actualizado ahora', 'Temperatura del aire', 'Temperatura del mar', 'Altura de ola', 'Parcialmente nublado', 'Agradable', 'Olas bajas', 'Más condiciones', 'Viento', 'Marea', 'Visibilidad', 'Índice UV', 'Puntuación de seguridad', 'Precaución de hoy', 'Índice UV alto y cambio de marea a las 16:40', 'Todo', 'Tienda', 'Baño', 'Información', 'Farmacia', 'Consigna', 'Carga', 'Accesible', 'Cómo llegar', 'Accidente marítimo', 'Persona desaparecida', 'Emergencia médica', 'Amenaza de seguridad', 'Incendio o humo', 'Otra emergencia', 'Elige una situación para usar tu ubicación actual.', 'Ubicación GPS', 'Mensaje automático', 'Guardia Costera', 'Emergencias marítimas', 'Policía', 'Amenazas y delitos', 'Bomberos y ambulancia', 'Emergencias médicas y de incendio', 'Destinatario demo: 010-2659-7174. No se enviará ningún mensaje real.', 'Mensaje enviado', 'El informe de demostración se entregó correctamente.']
};
const detailedSelectors = ['.conditions .card-title button', '.weather-grid div:nth-child(1) p', '.weather-grid div:nth-child(2) p', '.weather-grid div:nth-child(3) p', '.weather-grid .good', '.facility-grid button:nth-child(1) b', '.facility-grid button:nth-child(2) b', '.facility-grid button:nth-child(3) b', '.location-line small', '.ocean-overview div:nth-child(1) span', '.ocean-overview div:nth-child(2) span', '.ocean-overview div:nth-child(3) span', '.ocean-overview div:nth-child(1) em', '.ocean-overview div:nth-child(2) em', '.ocean-overview div:nth-child(3) em', '.detail-card h2', '.detail-grid p:nth-child(1) span', '.detail-grid p:nth-child(2) span', '.detail-grid p:nth-child(3) span', '.detail-grid p:nth-child(4) span', '.score span', '.caution-card h2', '.caution-head p', '.filter:nth-child(1)', '.filter:nth-child(2)', '.filter:nth-child(3)', '.filter:nth-child(4)', '.filter:nth-child(5)', '.filter:nth-child(6)', '.filter:nth-child(7)', '.filter:nth-child(8)', '.place-sheet button', '.situation-card:nth-child(1) span', '.situation-card:nth-child(2) span', '.situation-card:nth-child(3) span', '.situation-card:nth-child(4) span', '.situation-card:nth-child(5) span', '.situation-card:nth-child(6) span', '#emergency-screen .location-note', '#sms-screen .gps-status b', '#sms-screen .message-preview span', '.agency-button:nth-child(1) span', '.agency-button:nth-child(1) small', '.agency-button:nth-child(2) span', '.agency-button:nth-child(2) small', '.agency-button:nth-child(3) span', '.agency-button:nth-child(3) small', '.send-note', '#sent-confirmation b', '#sent-confirmation span'];
const previousApplyLanguage = applyLanguage;
applyLanguage = (language) => { currentLanguage = language; previousApplyLanguage(language); detailedSelectors.forEach((selector, index) => { const element = document.querySelector(selector); if (element) element.textContent = detailedCopy[language][index]; }); };
document.querySelector('#language-toggle').addEventListener('click', () => { const menu = document.querySelector('#language-menu'); menu.hidden = !menu.hidden; });
document.querySelectorAll('#language-menu button').forEach((button) => button.addEventListener('click', () => { applyLanguage(button.dataset.language); document.querySelector('#language-menu').hidden = true; }));
applyLanguage(localStorage.getItem('busan-sea-care-language') || 'en');
