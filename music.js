(() => {
  const audio = document.getElementById('wedding-music');
  const button = document.getElementById('music-toggle');
  const status = document.getElementById('music-status');
  audio.volume = 0.4;
  let pending = false;
  function sync() {
    const playing = !audio.paused && !audio.ended;
    button.classList.toggle('is-playing', playing);
    const label = playing ? '暂停背景音乐' : '播放背景音乐';
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  async function play() {
    if (pending) return;
    pending = true;
    status.textContent = '';
    try { await audio.play(); }
    catch (error) {
      if (error.name !== 'AbortError') status.textContent = '音乐暂未播放，请点击播放按钮重试。';
    } finally { pending = false; sync(); }
  }
  button.addEventListener('click', () => {
    if (audio.paused) play();
    else audio.pause();
  });
  document.getElementById('open').addEventListener('click', play);
  for (const id of ['replay', 'again']) {
    document.getElementById(id).addEventListener('click', () => audio.pause());
  }
  for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, sync);
  audio.addEventListener('error', () => {
    audio.pause();
    sync();
    status.textContent = '音乐暂时无法加载，请稍后再试。';
  });
  sync();
})();