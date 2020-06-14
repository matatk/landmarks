export default function LandmarksCounter() {
	let frameLandmarks = {}

	//
	// Public API
	//

	this.totalNumberOfLandmarks = function() {
		return Object.values(frameLandmarks).reduce(
			(accumulator, currentValue) => accumulator + currentValue, 0)
	}

	this.updateLandmarkCountForFrame = function(frame, landmarks) {
		frameLandmarks[frame] = landmarks
	}

	this.reset = function() {
		frameLandmarks = {}
	}
}
