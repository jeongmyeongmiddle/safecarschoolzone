// ==========================================
// 1. 주요 데이터 및 설정값
// ==========================================
// 학교 앞 위험 일방통행 구역 좌표 (실제 학교 위치 좌표로 변경하세요)
const SCHOOL_ZONE = {
    lat: 37.5665,  // 예시: 위도
    lng: 126.9780, // 예시: 경도
    radius: 150    // 감지 반경 (미터 단위: 150m 이내 진입 시 안내)
};

let watchId = null;
let isAnnounced = false; // 중복 음성 방지 플래그

// DOM 요소 참조
const startBtn = document.getElementById('start-btn');
const statusBadge = document.getElementById('status-badge');
const routeInfo = document.getElementById('route-info');
const latVal = document.getElementById('lat-val');
const lngVal = document.getElementById('lng-val');
const congestionToggle = document.getElementById('congestion-toggle');

// ==========================================
// 2. 유틸리티 함수: 두 좌표 사이 거리 계산 (Haversine 공식)
// ==========================================
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 지구 반경 (m)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위 거리 반환
}

// ==========================================
// 3. 음성 안내 (TTS) 함수
// ==========================================
function speak(message) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // 이전 음성 취소
        const speech = new SpeechSynthesisUtterance(message);
        speech.lang = 'ko-KR';
        speech.rate = 0.95; // 목소리 속도
        speech.pitch = 1.0;
        window.speechSynthesis.speak(speech);
    }
}

// ==========================================
// 4. 위치 추적 및 우회 판단 로직
// ==========================================
function handlePositionUpdate(position) {
    const { latitude, longitude } = position.coords;
    
    // UI 좌표 업데이트
    latVal.textContent = latitude.toFixed(5);
    lngVal.textContent = longitude.toFixed(5);

    // 학교 구역과의 거리 계산
    const distance = getDistanceInMeters(latitude, longitude, SCHOOL_ZONE.lat, SCHOOL_ZONE.lng);
    const isCongested = congestionToggle.checked; // 차단기/혼잡 상태 여부

    // 조건: 학교 앞 근접 + 차단기 내려감(혼잡 상태)
    if (distance <= SCHOOL_ZONE.radius && isCongested) {
        statusBadge.textContent = "⚠️ 혼잡 구간 경고";
        statusBadge.className = "badge badge-warning";
        routeInfo.textContent = "현재 학교 앞 일방통행로가 혼잡합니다. 더 큰 도로로 우회해 주세요!";

        if (!isAnnounced) {
            speak("등하교 시간 학교 앞 일방통행로 차단기가 작동 중입니다. 학생들의 안전을 위해 우회 도로로 진입해 주세요.");
            isAnnounced = true; // 음성 반복 출력 방지
        }
    } else {
        statusBadge.textContent = "🟢 정상 주행";
        statusBadge.className = "badge badge-safe";
        routeInfo.textContent = "직진 진행 가능합니다. 안전 운전 하세요.";
        isAnnounced = false; // 구역 이탈 시 다시 안내받을 수 있도록 리셋
    }
}

function handleError(err) {
    console.error("GPS 오류:", err);
    routeInfo.textContent = "위치 정보를 가져올 수 없습니다. GPS 권한을 확인해주세요.";
}

// ==========================================
// 5. 이벤트 리스너
// ==========================================
startBtn.addEventListener('click', () => {
    if (!watchId) {
        // GPS 추적 시작
        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 5000
            });
            startBtn.textContent = "안내 종료하기";
            startBtn.classList.add('btn-active');
            speak("스쿨존 안전 안내를 시작합니다.");
        } else {
            alert("이 브라우저는 위치 서비스를 지원하지 않습니다.");
        }
    } else {
        // GPS 추적 중지
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        startBtn.textContent = "GPS 안내 시작하기";
        startBtn.classList.remove('btn-active');
        statusBadge.textContent = "운행 준비 완료";
        statusBadge.className = "badge badge-normal";
        routeInfo.textContent = "주행을 시작하려면 아래 버튼을 누르세요.";
        speak("안내를 종료합니다.");
    }
});
