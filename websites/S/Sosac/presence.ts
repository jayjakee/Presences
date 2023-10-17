const presence = new Presence({
		clientId: "1079537235076071524",
	}),
	strings = presence.getStrings({
		play: "general.playing",
		pause: "general.paused",
		browsing: "general.browsing",
	});
let video = {
	duration: 0,
	currentTime: 0,
	paused: true,
};

const enum Assets {
	Logo = "https://cdn.rcd.gg/PreMiD/websites/S/Sosac/assets/logo.png",
}

presence.on(
	"iFrameData",
	(data: { duration: number; currentTime: number; paused: boolean }) => {
		video = data;
	}
);

presence.on("UpdateData", async () => {
	const strs = await strings,
		presenceData: PresenceData = {
			largeImageKey: Assets.Logo,
		};
	if (
		video &&
		!isNaN(video.duration) &&
		document.location.pathname.includes("/player")
	) {
		[presenceData.startTimestamp, presenceData.endTimestamp] =
			presence.getTimestamps(
				Math.floor(video.currentTime),
				Math.floor(video.duration)
			);

		const firstH3Title = document.querySelector("h3"),
			subdomain = document.location.href.match(/^(?:https?:\/\/)?([^/]+)/i)[1].split(".")[0];
			

		if (firstH3Title) {
			const originalText = firstH3Title.textContent,
				// Movie/Series name

				// Episode number
				epimatch = originalText.match(/\d+x\d+/);

			presenceData.details = `${originalText.match(/^([^\n]+)/)[1]} ${
				epimatch ? epimatch[0] : " "
			}`;
		}
		presenceData.largeImageKey = await uploadImage(`https://${subdomain}.sosac.tv/images/75x109/${
			subdomain === "movies" ? "movie" : "serial"
		}-${
			document.querySelector(".track").getAttribute("onclick").match(/\d+/)[0]
		}.jpg`);
		presenceData.smallImageKey = video.paused ? Assets.Pause : Assets.Play;
		presenceData.smallImageText = video.paused ? strs.pause : strs.play;

		if (video.paused) {
			delete presenceData.startTimestamp;
			delete presenceData.endTimestamp;
		}

		presenceData.buttons = [{ label: "Watch on Sosac", url: document.location.href }];
		presence.setActivity(presenceData, !video.paused);
	} else {
		presenceData.details = strs.browsing;
		presenceData.smallImageKey = Assets.Search;
		presenceData.smallImageText = strs.browsing;
		presence.setActivity(presenceData);
	}
});

let isUploading = false;

const uploadedImages: Record<string, string> = {};
async function uploadImage(urlToUpload: string): Promise<string> {
	if (isUploading) return "plex";

	if (uploadedImages[urlToUpload]) return uploadedImages[urlToUpload];
	isUploading = true;

	const file = await fetch(urlToUpload).then(x => x.blob()),
		formData = new FormData();

	formData.append("file", file, "file");

	const response = await fetch("https://pd.premid.app/create/image", {
			method: "POST",
			body: formData,
		}),
		responseUrl = await response.text();

	isUploading = false;
	uploadedImages[urlToUpload] = responseUrl;
	return responseUrl;
}
