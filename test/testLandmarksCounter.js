import test from 'ava'
import LandmarksCounter from '../src/code/landmarksCounter'

test('no landmarks reported at startup', t => {
	const landmarksCounter = new LandmarksCounter()
	t.deepEqual(landmarksCounter.totalNumberOfLandmarks(), 0)
})

test('adding a landmark to the main frame', t => {
	const landmarksCounter = new LandmarksCounter()
	landmarksCounter.updateLandmarkCountForFrame(0, 42)
	t.deepEqual(landmarksCounter.totalNumberOfLandmarks(), 42)
})

test('adding a landmark to the main and another frame', t => {
	const landmarksCounter = new LandmarksCounter()
	landmarksCounter.updateLandmarkCountForFrame(0, 42)
	landmarksCounter.updateLandmarkCountForFrame(20020316, 1)
	t.deepEqual(landmarksCounter.totalNumberOfLandmarks(), 43)
})

test('adding a landmark then resetting', t => {
	const landmarksCounter = new LandmarksCounter()
	landmarksCounter.updateLandmarkCountForFrame(0, 42)
	landmarksCounter.reset()
	t.deepEqual(landmarksCounter.totalNumberOfLandmarks(), 0)
})

test('adding a landmark to the main and another frame and resetting', t => {
	const landmarksCounter = new LandmarksCounter()
	landmarksCounter.updateLandmarkCountForFrame(0, 42)
	landmarksCounter.updateLandmarkCountForFrame(20020316, 1)
	landmarksCounter.reset()
	t.deepEqual(landmarksCounter.totalNumberOfLandmarks(), 0)
})
