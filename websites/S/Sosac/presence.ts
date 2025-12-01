import { Assets } from 'premid'

const presence = new Presence({
  clientId: '1079537235076071524',
})

const strings = presence.getStrings({
  play: 'general.playing',
  pause: 'general.paused',
  browsing: 'general.browsing',
})

let video = {
  duration: 0,
  currentTime: 0,
  paused: true,
}

enum ActivityAssets {
  Logo = 'https://cdn.rcd.gg/PreMiD/websites/S/Sosac/assets/logo.png',
}

presence.on('iFrameData', (data: unknown) => {
  video = data as typeof video
})

presence.on('UpdateData', async () => {
  const strs = await strings

  const presenceData: PresenceData = {
    largeImageKey: ActivityAssets.Logo,
    type: 3,
  }

  const onPlayer = document.location.pathname.includes('/player')

  if (video && !Number.isNaN(video.duration) && onPlayer) {

    const h3 = document.querySelector('h3')
    const text = h3?.textContent || ''

    const title = text.match(/^([^\n]+)/)?.[1] || ''
    const episode = text.match(/\d+x\d+/)?.[0] || ''

    presenceData.details = title
    presenceData.state = episode || ''

    if (!video.paused) {
      const now = Math.floor(Date.now() / 1000)
      const left = Math.max(0, Math.floor(video.duration - video.currentTime))

      presenceData.startTimestamp = now
      presenceData.endTimestamp = now + left
    } else {
      delete presenceData.startTimestamp
      delete presenceData.endTimestamp
    }

    const subdomain = document.location.href
      .match(/^(?:https?:\/\/)?([^/]+)/i)?.[1]
      ?.split('.')[0]

    const id = document
      .querySelector('.track')
      ?.getAttribute('onclick')
      ?.match(/\d+/)?.[0]

    if (id) {
      presenceData.largeImageKey = await uploadImage(
        `https://${subdomain}.sosac.tv/images/75x109/${
          subdomain === 'movies' ? 'movie' : 'serial'
        }-${id}.jpg`
      )
    }

    presenceData.smallImageKey = video.paused ? Assets.Pause : Assets.Play
    presenceData.smallImageText = video.paused ? strs.pause : strs.play

    presenceData.buttons = [
      { label: 'Open Sosac', url: document.location.href },
    ]

    presence.setActivity(presenceData, !video.paused)
  } else {
    presenceData.details = 'Browsing'
    presenceData.smallImageKey = Assets.Search
    presenceData.smallImageText = strs.browsing
    presence.setActivity(presenceData)
  }
})

let isUploading = false
const uploadedImages: Record<string, string> = {}

async function uploadImage(urlToUpload: string): Promise<string> {
  if (isUploading) return ActivityAssets.Logo
  if (uploadedImages[urlToUpload]) return uploadedImages[urlToUpload]

  isUploading = true

  const file = await fetch(urlToUpload).then(x => x.blob())
  const formData = new FormData()
  formData.append('file', file, 'file')

  const response = await fetch('https://pd.premid.app/create/image', {
    method: 'POST',
    body: formData,
  })

  const url = await response.text()
  uploadedImages[urlToUpload] = url

  isUploading = false
  return url
}
