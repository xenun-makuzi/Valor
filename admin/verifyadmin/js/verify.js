const sb = supabase.createClient(window.VERIFYADMIN_SUPABASE_URL, window.VERIFYADMIN_SUPABASE_ANON_KEY);

const S = {
  step: 1,
  name: '',
  dob: '',
  country: '',
  docType: 'National ID',
  docFile: null,
  selfieBlob: null,
  stream: null
};

const $ = s => document.querySelector(s);

function go(n) {
  S.step = n;
  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  $(`#s${n}`).classList.add('active');
  document.querySelectorAll('.steps>div').forEach((x, i) => x.classList.toggle('active', i === n - 1));
  $('#bar').style.width = (n === 4 ? '100' : n * 33) + '%';
  scrollTo({ top: 0, behavior: 'smooth' });
}

// Step 1: Personal Info
$('#personal').onsubmit = e => {
  e.preventDefault();
  S.name = $('#name').value.trim();
  S.dob = $('#dob').value;
  S.country = $('#country').value;
  go(2);
};

// Step 2: Document Choice & File Select
document.querySelectorAll('.doc').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.doc').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    S.docType = b.dataset.type || 'National ID';
  };
});

$('#choose').onclick = () => $('#document').click();

$('#document').onchange = e => {
  const f = e.target.files[0];
  if (!f || !f.type.startsWith('image/')) return;
  S.docFile = f;
  $('#docPreview').src = URL.createObjectURL(f);
  $('#docPreview').classList.remove('hidden');
  $('#next2').disabled = false;
};

$('#back1').onclick = () => go(1);
$('#next2').onclick = () => go(3);
$('#back2').onclick = () => {
  stop();
  go(2);
};

// Step 3: Camera & Submission
async function camera() {
  try {
    S.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    $('#video').srcObject = S.stream;
    $('#cameraMsg').classList.add('hidden');
    $('#startCam').textContent = 'Camera enabled';
    $('#capture').disabled = false;
    $('#camStatus').textContent = 'Camera enabled. Position your face inside the guide.';
  } catch (e) {
    $('#camStatus').textContent = 'Camera unavailable. Choose a sample selfie photo instead.';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = ev => {
      const f = ev.target.files[0];
      if (f) {
        S.selfieBlob = f;
        $('#selfiePreview').src = URL.createObjectURL(f);
        $('#selfiePreview').classList.remove('hidden');
        $('#video').classList.add('hidden');
        
        // Auto-submit only if all preceding step fields are populated
        if (S.name && S.dob && S.country && S.docFile) {
          submit();
        } else {
          alert('Selfie attached. Please ensure Step 1 and Step 2 details are completed before submitting.');
        }
      }
    };
    input.click();
  }
}

$('#startCam').onclick = camera;

$('#capture').onclick = () => {
  const c = $('#canvas'), v = $('#video');
  c.width = v.videoWidth || 640;
  c.height = v.videoHeight || 480;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  c.toBlob(b => {
    S.selfieBlob = b;
    stop();
    submit();
  }, 'image/jpeg', 0.86);
};

function stop() {
  if (S.stream) {
    S.stream.getTracks().forEach(t => t.stop());
    S.stream = null;
  }
}

function ref() {
  return 'VF-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function submit() {
  if (!S.name || !S.dob || !S.country || !S.docFile || !S.selfieBlob) {
    alert('Missing required fields. Please step back and verify all inputs are provided.');
    return;
  }

  $('#capture').disabled = true;
  $('#camStatus').textContent = 'Submitting securely…';

  try {
    const id = crypto.randomUUID();
    const reference = ref();
    const docPath = `${id}/document-${Date.now()}`;
    const selfiePath = `${id}/selfie-${Date.now()}`;

    // Upload Document
    let r = await sb.storage.from('verification-documents').upload(docPath, S.docFile, {
      contentType: S.docFile.type || 'image/jpeg',
      upsert: false
    });
    if (r.error) throw r.error;

    // Upload Selfie
    r = await sb.storage.from('verification-selfies').upload(selfiePath, S.selfieBlob, {
      contentType: 'image/jpeg',
      upsert: false
    });
    if (r.error) throw r.error;

    // Insert Submission Row
    r = await sb.from('verification_submissions').insert({
      id,
      reference_number: reference,
      full_name: S.name,
      date_of_birth: S.dob,
      country: S.country,
      document_type: S.docType,
      document_path: docPath,
      selfie_path: selfiePath,
      status: 'under_review'
    });
    if (r.error) throw r.error;

    // Display Confirmation Screen
    $('#reference').textContent = reference;
    $('#statusLink').href = `status.html?ref=${encodeURIComponent(reference)}`;
    go(4);
  } catch (e) {
    console.error('Submission processing error:', e);
    alert('Submission failed: ' + (e.message || 'Check console logs for details.'));
    $('#capture').disabled = false;
  }
}

window.addEventListener('beforeunload', stop);