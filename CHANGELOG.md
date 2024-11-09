# Changelog

## [2.13.0](https://github.com/matatk/landmarks/compare/2.12.0...2.13.0) (2024-11-09)


### Features

* Add option to handle via tree (does nothing functional) ([a7bafe9](https://github.com/matatk/landmarks/commit/a7bafe9f46575e00ac9d330702228c8ea7e5fa5a))
* Better DevTools mutation reporting ([2e2034b](https://github.com/matatk/landmarks/commit/2e2034bd68ff665163ff65f0f695a11928d9f963))
* Chrome 'Manifest V3' support ([6a09399](https://github.com/matatk/landmarks/commit/6a0939946bf6c7d4ec4285cd7ef625a938b1d3ba))
* Improve tree robustosity ([b3ed9bd](https://github.com/matatk/landmarks/commit/b3ed9bd130f925018293f927dd202aa774e6c13f))


### Bug fixes

* Fix a range of deeper TypeScript isseus ([562d9cc](https://github.com/matatk/landmarks/commit/562d9cc9f1a418eafc30ceea9b3b6c64161dfb9a))
* Robust message handling ([90f38d1](https://github.com/matatk/landmarks/commit/90f38d1c2e9623c00d45aa5805a9256fff3efa32))
* Tidy-ups, fix more bugs (some long-standing) ([1c10394](https://github.com/matatk/landmarks/commit/1c1039437cde0ba02c9455403928fb7e226510e5))


### Documentation

* **Help:** Release notes for 2.13.0 ([b8841ca](https://github.com/matatk/landmarks/commit/b8841cab27c7feadc8024433f95059f6e9b1ca7f))
* Update Chrome API usage info ([ed06f96](https://github.com/matatk/landmarks/commit/ed06f9688d202c4fe4decf6d09d323222a82fd92))


### Code refactoring

* Combine scanners; Split profiling script ([fb9acdb](https://github.com/matatk/landmarks/commit/fb9acdb2eb31c0a215608bb7c9c63226024e13aa))
* Switch to TypeScript ([96531f0](https://github.com/matatk/landmarks/commit/96531f0ee377d0de27ade743a29a76dcf0cad1b5))
* Use a tree structure in LandmarksFinder ([e1308f7](https://github.com/matatk/landmarks/commit/e1308f7aa1dbe144fd32849e15df450df521b5c6))
* Use tree structure in UI code ([38ee039](https://github.com/matatk/landmarks/commit/38ee039dd12ce02d8cd3bfe2c02a73297487219d))


### Tests

* More tests; More perf ([680f8bd](https://github.com/matatk/landmarks/commit/680f8bd46a724ac86475102c0b2538578476cb60))
* Tree-based mutation handling & tests ([aee65fd](https://github.com/matatk/landmarks/commit/aee65fd71a65fac20798eacea77ebac208a2b430))

## [2.12.0](https://github.com/matatk/landmarks/compare/2.11.1...2.12.0) (2022-10-10)


### Features

* Highlight landmark on button focus or hover ([#478](https://github.com/matatk/landmarks/issues/478)) ([b98f04b](https://github.com/matatk/landmarks/commit/b98f04bd5b6c7e211c20c81352b34268e8c04ffe))
* Option to close the pop-up immediately on using a landmark button ([#480](https://github.com/matatk/landmarks/issues/480)) ([9ebb1d7](https://github.com/matatk/landmarks/commit/9ebb1d7200c6c56e5addded4d321e31d9785b0c1)), closes [#477](https://github.com/matatk/landmarks/issues/477)


### Continuous integrations

* Move to GitHub Action for PR title checking ([c54e1a5](https://github.com/matatk/landmarks/commit/c54e1a5de172793cdf120048a6f08994f2c6abdc))


### Documentation

* **Help:** Release notes for 2.12.0 ([#489](https://github.com/matatk/landmarks/issues/489)) ([bbddfed](https://github.com/matatk/landmarks/commit/bbddfed39e0ff18269cdcdd41d0f0c8fb895f051))


### Bug fixes

* Don't double-up on making releases ([c2841c3](https://github.com/matatk/landmarks/commit/c2841c3b99cb0fdb4eaef0073d2cf05f53aa0f8f))
* Don't un-highlight persistent border ([#487](https://github.com/matatk/landmarks/issues/487)) ([67a8006](https://github.com/matatk/landmarks/commit/67a8006586a22e0e2378f9a58b3ff7a7338a5c29))
* **Help:** Reflect that the sidebar was reinstated on Opera ([#483](https://github.com/matatk/landmarks/issues/483)) ([0e52289](https://github.com/matatk/landmarks/commit/0e5228915c918d520bdbb3fbdfa95804f3bff6d0))
* Remove redundant code from builds ([#481](https://github.com/matatk/landmarks/issues/481)) ([35aeebe](https://github.com/matatk/landmarks/commit/35aeebe4946a53308a5e16f7e3aa19e69a2b3f34))
* Validate border size setting ([#486](https://github.com/matatk/landmarks/issues/486)) ([4399f82](https://github.com/matatk/landmarks/commit/4399f82ee0e4fb841ff53c70c5d3decb5138e86c)), closes [#484](https://github.com/matatk/landmarks/issues/484)


### Builds

* Clean up CHANGELOG.md ([b53bb69](https://github.com/matatk/landmarks/commit/b53bb694b7c2f2fc51e6cc238b1fdb059f83a293))
* Use release-it ([#488](https://github.com/matatk/landmarks/issues/488)) ([8ccf7c5](https://github.com/matatk/landmarks/commit/8ccf7c5e7750237a53634b1554ed3c438ac87692))

## [2.11.1](https://github.com/matatk/landmarks/compare/2.11.0...2.11.1) (2022-04-01)


### Builds

* Factor out and share finder-making code ([#465](https://github.com/matatk/landmarks/issues/465)) ([b9196da](https://github.com/matatk/landmarks/commit/b9196dab75ef77f65bb563979b4d7de4cc136485))


### Performance improvements

* Remove a check; Restructure ([#468](https://github.com/matatk/landmarks/issues/468)) ([6a3a964](https://github.com/matatk/landmarks/commit/6a3a96483d0492840b7a53ea1412fbbd9c5b3de3))
* Tweak hidden element detection ([#469](https://github.com/matatk/landmarks/issues/469)) ([43997fc](https://github.com/matatk/landmarks/commit/43997fc1f777c9ac4cc9b178076ee88a8009412e))


### Bug fixes

* Correct dark mode colours in DevTools panel ([#470](https://github.com/matatk/landmarks/issues/470)) ([b59b846](https://github.com/matatk/landmarks/commit/b59b846f6c6597d0221ac5a502a6285de5ae93d3)), closes [#466](https://github.com/matatk/landmarks/issues/466)
* Restore sidebar on Opera ([#471](https://github.com/matatk/landmarks/issues/471)) ([6d7b0ba](https://github.com/matatk/landmarks/commit/6d7b0ba13bbbdafee9b5b8e75011629652afd4ca))
* Support the "role" attribute correctly as a token list ([#467](https://github.com/matatk/landmarks/issues/467)) ([2ca800a](https://github.com/matatk/landmarks/commit/2ca800a6725b87e11f3010a629172307f28bf097)), closes [#464](https://github.com/matatk/landmarks/issues/464)


### Documentation

* Add updated Opera sidebar screengrab ([#472](https://github.com/matatk/landmarks/issues/472)) ([2581b0f](https://github.com/matatk/landmarks/commit/2581b0fee703340017a609920b144108e42849aa))
* **Help:** Release notes for 2.11.1 ([#473](https://github.com/matatk/landmarks/issues/473)) ([158955a](https://github.com/matatk/landmarks/commit/158955a6b6170ae5fbcb35d47a28503fb4cda0a1))


### Chores

* Bump dependencies ([#474](https://github.com/matatk/landmarks/issues/474)) ([2d38fed](https://github.com/matatk/landmarks/commit/2d38fedd3ae098b068b8c849320d002f81ac275b))

## [2.11.0](https://github.com/matatk/landmarks/compare/2.10.1...2.11.0) (2021-11-30)


### Features

* Add an option to control whether heuristics are used ([#459](https://github.com/matatk/landmarks/issues/459)) ([116251d](https://github.com/matatk/landmarks/commit/116251d8633ba121fb61f92c7a138c0f262182a3)), closes [#457](https://github.com/matatk/landmarks/issues/457)


### Bug fixes

* Ensure pages loaded in the foreground tab are monitored for changes ([#460](https://github.com/matatk/landmarks/issues/460)) ([9216a38](https://github.com/matatk/landmarks/commit/9216a38504c6fa776402c9f4adb94f7d043987cc)), closes [#458](https://github.com/matatk/landmarks/issues/458)


### Documentation

* **Help:** Release notes for 2.11.0 ([#461](https://github.com/matatk/landmarks/issues/461)) ([c5062a7](https://github.com/matatk/landmarks/commit/c5062a7a47261be072f6ce1eef1c812c9f54d4e8))


### Builds

* Improve reviewer info script ([#456](https://github.com/matatk/landmarks/issues/456)) ([086041d](https://github.com/matatk/landmarks/commit/086041d79a812d88eaa7d6ed6bab7f538742f4ab))
* Run the local copy of standard-version ([#462](https://github.com/matatk/landmarks/issues/462)) ([e688b13](https://github.com/matatk/landmarks/commit/e688b13b95db3c2cac9d03e969c6cf52fe328ce3))

## [2.10.1](https://github.com/matatk/landmarks/compare/2.10.0...2.10.1) (2021-08-14)


### Builds

* Generate Edge moderator info ([#444](https://github.com/matatk/landmarks/issues/444)) ([a6755ec](https://github.com/matatk/landmarks/commit/a6755ece48d80413285174b0189c2869dbd5a519))


### Bug fixes

* Ensure update notice returns after an update ([#446](https://github.com/matatk/landmarks/issues/446)) ([bafb3cf](https://github.com/matatk/landmarks/commit/bafb3cf0d92ecb5a39eabc69d565879002e7edd1))
* Ignore guessed regions with no innerText ([#445](https://github.com/matatk/landmarks/issues/445)) ([46eed4c](https://github.com/matatk/landmarks/commit/46eed4cc2a54163a2e2b0a63cfee48f70b81401f))
* Localise string for guessed landmarks ([#451](https://github.com/matatk/landmarks/issues/451)) ([de6e84a](https://github.com/matatk/landmarks/commit/de6e84a357ebe50339832f62365850a41e2a9942)), closes [#449](https://github.com/matatk/landmarks/issues/449)
* Neater settings handling ([#450](https://github.com/matatk/landmarks/issues/450)) ([de25942](https://github.com/matatk/landmarks/commit/de25942990a42cd83be2883aee5f33f0c57e5eb3)), closes [#448](https://github.com/matatk/landmarks/issues/448)
* Reflect opera sidebar bug ([#447](https://github.com/matatk/landmarks/issues/447)) ([d07b222](https://github.com/matatk/landmarks/commit/d07b2220146df89af6e8f02b4d8c8ae072057a2a))
* Replace persistent border after un-show-all ([#452](https://github.com/matatk/landmarks/issues/452)) ([5bda689](https://github.com/matatk/landmarks/commit/5bda6891f6e699a8d1f0bdc626972031a745de71)), closes [#404](https://github.com/matatk/landmarks/issues/404)


### Documentation

* Notes for 2.10.1 ([#453](https://github.com/matatk/landmarks/issues/453)) ([876e98d](https://github.com/matatk/landmarks/commit/876e98dddb5bc1dfa3c6abf081366f350d624d16))

## [2.10.0](https://github.com/matatk/landmarks/compare/2.9.0...2.10.0) (2021-08-07)


### Features

* Guess the "main" region if none exists ([#430](https://github.com/matatk/landmarks/issues/430)) ([2131b04](https://github.com/matatk/landmarks/commit/2131b0448d2b0ddc83a5ac0918552dcda44336e7)), closes [#181](https://github.com/matatk/landmarks/issues/181)
* Guess the "navigation" regions if none exist ([#435](https://github.com/matatk/landmarks/issues/435)) ([5226c0c](https://github.com/matatk/landmarks/commit/5226c0ccc68dc4abbfc75634a299ca93b6b10e79)), closes [#181](https://github.com/matatk/landmarks/issues/181)
* More in-keeping DevTools style ([#418](https://github.com/matatk/landmarks/issues/418)) ([ba805a9](https://github.com/matatk/landmarks/commit/ba805a92cc457e71dd6076307d125db93250088a)), closes [#405](https://github.com/matatk/landmarks/issues/405)
* More warnings; Style; Remove top-level panel ([#422](https://github.com/matatk/landmarks/issues/422)) ([9984007](https://github.com/matatk/landmarks/commit/9984007ff14a49cb2ea115c24aa85aa36c8f6278))


### Tests

* Include both LandmarksFinders in tests ([#416](https://github.com/matatk/landmarks/issues/416)) ([989e2e3](https://github.com/matatk/landmarks/commit/989e2e37e8424a11474929f81c1a323711f7c8d3))


### Continuous integrations

* Bump Actions ([e5d44f2](https://github.com/matatk/landmarks/commit/e5d44f2e5fae6978c46f6af39e58ba918316c747))
* Use npm ci in Action ([492ed23](https://github.com/matatk/landmarks/commit/492ed2376401f3717288cdfdbd6aa0c570697c7b)), closes [#419](https://github.com/matatk/landmarks/issues/419)


### Performance improvements

* Fix profiling script; Compare standard and developer scanners ([#431](https://github.com/matatk/landmarks/issues/431)) ([466c8ec](https://github.com/matatk/landmarks/commit/466c8ec68e5df8705f6a751131c20015a93e2f31))
* Streamlining scans and messaging; Debugging info ([#428](https://github.com/matatk/landmarks/issues/428)) ([94d06df](https://github.com/matatk/landmarks/commit/94d06dff39736d3f3fe7bbbc4c65a5a83978afab))


### Bug fixes

* Catch content script not being loaded yet ([#429](https://github.com/matatk/landmarks/issues/429)) ([78eab22](https://github.com/matatk/landmarks/commit/78eab22b7aa251c088d2eef8dee3ddbffb48f0f9))
* Handle zero page warnings properly ([#425](https://github.com/matatk/landmarks/issues/425)) ([20d4945](https://github.com/matatk/landmarks/commit/20d49451ee85a7264ee726e2775663e82e6d6339))
* Remove/reinstate the correct DevTools tab/pane ([#423](https://github.com/matatk/landmarks/issues/423)) ([978f874](https://github.com/matatk/landmarks/commit/978f8748ee339e3ec555046624bc032702cb68ec))
* Rename default branch ([f232270](https://github.com/matatk/landmarks/commit/f2322703840e3fbfb5c3312a25e0993e0f714cfe))
* Short-circuit and robustify guessed main behaviour ([#433](https://github.com/matatk/landmarks/issues/433)) ([050e1cf](https://github.com/matatk/landmarks/commit/050e1cfc38383be3567be6eabc36fb6f5c8acadc))


### Chores

* Bump dependencies ([#421](https://github.com/matatk/landmarks/issues/421)) ([c95d49e](https://github.com/matatk/landmarks/commit/c95d49e7f2f1fccac34f42030b9bb2066b35d84a))
* Bump dependencies ([#432](https://github.com/matatk/landmarks/issues/432)) ([b91f564](https://github.com/matatk/landmarks/commit/b91f56471ac4fc1e90ed511d84451e7c8d495fb6))
* Bump PSSST dependency ([#434](https://github.com/matatk/landmarks/issues/434)) ([c97854b](https://github.com/matatk/landmarks/commit/c97854b72ece84966a450383d6562f921af085fa))


### Builds

* Add compare script ([#426](https://github.com/matatk/landmarks/issues/426)) ([afabca2](https://github.com/matatk/landmarks/commit/afabca25e800e616fb6049c77399c6fa3dfad821))
* Add option to skip zipping ([#417](https://github.com/matatk/landmarks/issues/417)) ([ed7e446](https://github.com/matatk/landmarks/commit/ed7e4467188318c920fb1ebba73bf6a02ca72ebc))
* Switch to ES modules ([#436](https://github.com/matatk/landmarks/issues/436)) ([35cfd5b](https://github.com/matatk/landmarks/commit/35cfd5b2da9e8d2dc3d7e7258dc3bb983d52cb17))


### Styles

* Use the nullish coalescing operator ([#437](https://github.com/matatk/landmarks/issues/437)) ([665236b](https://github.com/matatk/landmarks/commit/665236b8f76f3f5b23d08058fe06db4d35fde415))


### Documentation

* Changes for 2.10.0 ([#442](https://github.com/matatk/landmarks/issues/442)) ([35aebf6](https://github.com/matatk/landmarks/commit/35aebf633cc65bcb26feedfe349792a822e7cafe))
* Document main-cycling; main/nav-finding ([#441](https://github.com/matatk/landmarks/issues/441)) ([d67f54d](https://github.com/matatk/landmarks/commit/d67f54da5bb17259ba7b6dd5efb4ece288c75076)), closes [#384](https://github.com/matatk/landmarks/issues/384)
* Fix borked link in CHANGELOG ([#438](https://github.com/matatk/landmarks/issues/438)) ([174e583](https://github.com/matatk/landmarks/commit/174e583a9b72232eeb86c5bb8aa0fa101eb8e8da)), closes [#414](https://github.com/matatk/landmarks/issues/414)
* Update resources and general help info ([#439](https://github.com/matatk/landmarks/issues/439)) ([3c5af69](https://github.com/matatk/landmarks/commit/3c5af6983d0a9b84aa81990beb370c7a74eba66d))
* Update screengrabs ([#440](https://github.com/matatk/landmarks/issues/440)) ([d301fa4](https://github.com/matatk/landmarks/commit/d301fa40ad00093a53225075d75a8479cc139dd8)), closes [#387](https://github.com/matatk/landmarks/issues/387)

## [2.9.0](https://github.com/matatk/landmarks/compare/2.8.0...2.9.0) (2021-02-08)


### Features

* First steps in linting ([#410](https://github.com/matatk/landmarks/issues/410)) ([16181a5](https://github.com/matatk/landmarks/commit/16181a5b60bc464f21aaf53fb36083c96fd98ab1))
* Move DevTools UI to the DOM Inspector panel ([#392](https://github.com/matatk/landmarks/issues/392)) ([be81c50](https://github.com/matatk/landmarks/commit/be81c501a60db48674ee83bf09f1edf709c7e2a2))
* Navigate from focused element ([#409](https://github.com/matatk/landmarks/issues/409)) ([227790b](https://github.com/matatk/landmarks/commit/227790b54724f7a74cabee148742e368f6f44d7c)), closes [#395](https://github.com/matatk/landmarks/issues/395)
* Softer update notification ([#388](https://github.com/matatk/landmarks/issues/388)) ([f3453f1](https://github.com/matatk/landmarks/commit/f3453f16cb25ee64e5bf0037d6cd041252e6d961)), closes [#310](https://github.com/matatk/landmarks/issues/310)


### Tests

* Use the ES modules directly ([#385](https://github.com/matatk/landmarks/issues/385)) ([20683b2](https://github.com/matatk/landmarks/commit/20683b223cc64ebae2173ca264c79aca1534c576))


### Continuous integrations

* Remove Travis config; update badge ([#397](https://github.com/matatk/landmarks/issues/397)) ([7b98f73](https://github.com/matatk/landmarks/commit/7b98f7337017bf83b478634e335f206e6b3e19d4))
* Use GitHub Actions ([e6437dd](https://github.com/matatk/landmarks/commit/e6437dd2d1a8e26a53a17c8499251996e52d99d6))


### Builds

* Generate extra (marketing) icon sizes ([#403](https://github.com/matatk/landmarks/issues/403)) ([02d7ee6](https://github.com/matatk/landmarks/commit/02d7ee6b1b3da1dcbbb43952e8ad7cd14ce81d11)), closes [#380](https://github.com/matatk/landmarks/issues/380)
* **Test versions:** Simplify test versions ([#383](https://github.com/matatk/landmarks/issues/383)) ([3e08100](https://github.com/matatk/landmarks/commit/3e081004df610ba4339c4790db2ed55f6855b857))


### Bug fixes

* **Profiling:** Get the timing part working again ([#406](https://github.com/matatk/landmarks/issues/406)) ([a2d120c](https://github.com/matatk/landmarks/commit/a2d120c5f46d34c2bae02a1cd60d7a46aa1b18b4)), closes [#385](https://github.com/matatk/landmarks/issues/385)
* Typo in build script ([#399](https://github.com/matatk/landmarks/issues/399)) ([dbcecfd](https://github.com/matatk/landmarks/commit/dbcecfdb2e63ab19ffa90b6663340ac53805e2ec))
* Use concrete branch name for Actions workflow ([b6b7b50](https://github.com/matatk/landmarks/commit/b6b7b5001281d5706fdeda23d523c7b3481924fc))
* Work around Partner Center linting bug ([#398](https://github.com/matatk/landmarks/issues/398)) ([627c29c](https://github.com/matatk/landmarks/commit/627c29ce31a6ef164d11253e7bf9604f7ef7ad53))


### Performance improvements

* **Profiling:** Cache sites; Test focus-based navigation; Add test sites ([#408](https://github.com/matatk/landmarks/issues/408)) ([6e4532c](https://github.com/matatk/landmarks/commit/6e4532c7c7028ba84d42356cb1c6dd995ce2658e)), closes [#395](https://github.com/matatk/landmarks/issues/395)
* **Profiling:** Record more timing info ([#407](https://github.com/matatk/landmarks/issues/407)) ([73dfc05](https://github.com/matatk/landmarks/commit/73dfc058b5678d4b95d441703d1017d641d193ca))


### Chores

* Bump dependencies ([#390](https://github.com/matatk/landmarks/issues/390)) ([a0c0a62](https://github.com/matatk/landmarks/commit/a0c0a62cb5d63aed8eee21b4e2239f75be55ffe6))
* Bump dependencies ([#411](https://github.com/matatk/landmarks/issues/411)) ([e614493](https://github.com/matatk/landmarks/commit/e614493851d07408ba635c1de6f846091ca46aa8))
* Bump dependency ([#391](https://github.com/matatk/landmarks/issues/391)) ([376039f](https://github.com/matatk/landmarks/commit/376039f79cbd2f3dd509a9637180207039e3cc0a))


### Documentation

* Add tracking notifications to Storage API uses ([#401](https://github.com/matatk/landmarks/issues/401)) ([8363000](https://github.com/matatk/landmarks/commit/83630001ea5964d781b2e239c9c0778eb187f1fc)), closes [#386](https://github.com/matatk/landmarks/issues/386)
* Fix link to the changelog ([#402](https://github.com/matatk/landmarks/issues/402)) ([123803b](https://github.com/matatk/landmarks/commit/123803bbafc65f51a226932d70be83307f6fcf51)), closes [#379](https://github.com/matatk/landmarks/issues/379)
* Update help content for 2.9.0 ([#412](https://github.com/matatk/landmarks/issues/412)) ([b592fb8](https://github.com/matatk/landmarks/commit/b592fb8a7783ede6af8ae88bb2bab8a19cd907bb))
* **Metadata:** Add justification for storage permission ([#382](https://github.com/matatk/landmarks/issues/382)) ([b66710c](https://github.com/matatk/landmarks/commit/b66710cb0e79c51f0d8be7211be7ab67df0fa819)), closes [#381](https://github.com/matatk/landmarks/issues/381)

## [2.8.0](https://github.com/matatk/landmarks/compare/2.7.0...2.8.0) (2020-07-25)


### Features

* **DevTools:** Much clearer UI and more accessible definitions ([#363](https://github.com/matatk/landmarks/issues/363)) ([b15c614](https://github.com/matatk/landmarks/commit/b15c6146c039675cb0aabe9094353f2ac4ea936a))
* Cycle betwixt multiple main regions ([#373](https://github.com/matatk/landmarks/issues/373)) ([0b8bcb8](https://github.com/matatk/landmarks/commit/0b8bcb8b43e92f5217785f6e1df946fab3a07673)), closes [#371](https://github.com/matatk/landmarks/issues/371)
* New icons; Updated sizes and colour; New promotional image ([#362](https://github.com/matatk/landmarks/issues/362)) ([dbea8eb](https://github.com/matatk/landmarks/commit/dbea8eb8163fc5bffd12e72418ba990cd3643fa2)), closes [#183](https://github.com/matatk/landmarks/issues/183) [#186](https://github.com/matatk/landmarks/issues/186) [#184](https://github.com/matatk/landmarks/issues/184)


### Documentation

* Metadata updates across browsers ([#341](https://github.com/matatk/landmarks/issues/341)) ([b3612ac](https://github.com/matatk/landmarks/commit/b3612ac26058fbf330c17e7ad153d42fbc17e8bc))
* **Help:** Clearer spacing around keyboard info ([#353](https://github.com/matatk/landmarks/issues/353)) ([aa05df7](https://github.com/matatk/landmarks/commit/aa05df74c2e69566b8554112d0d8e751b1f1f0b4)), closes [#335](https://github.com/matatk/landmarks/issues/335)
* Release notes for 2.8.0 ([#377](https://github.com/matatk/landmarks/issues/377)) ([60f398e](https://github.com/matatk/landmarks/commit/60f398e497bee8c210b004fdae35d4805e729601))
* Remove spurious link from 2.6.0 release notes ([#372](https://github.com/matatk/landmarks/issues/372)) ([e6a543e](https://github.com/matatk/landmarks/commit/e6a543e807d31ad7fbd76013a28ba7a5491ffc48)), closes [#369](https://github.com/matatk/landmarks/issues/369)
* Update screengrabs ([#376](https://github.com/matatk/landmarks/issues/376)) ([49b5d00](https://github.com/matatk/landmarks/commit/49b5d00a81c37ac87f4c1f7aec28c6aba4ea718b)), closes [#118](https://github.com/matatk/landmarks/issues/118)


### Chores

* **Website:** Ignore locally-generated GitHub Pages kipple ([#356](https://github.com/matatk/landmarks/issues/356)) ([17a1b9c](https://github.com/matatk/landmarks/commit/17a1b9c76d26ee51ed4dfbd1d14765faa8296a6d))
* Bump dependencies ([#375](https://github.com/matatk/landmarks/issues/375)) ([900bba5](https://github.com/matatk/landmarks/commit/900bba55fb5fb38db4177a9798721361a9f46ece))
* Ignore all generated debugging traces ([#345](https://github.com/matatk/landmarks/issues/345)) ([c9badfe](https://github.com/matatk/landmarks/commit/c9badfea89ae7bcf848e46f65bf8e25baabc3bce))
* Move to page-structural-semantics-scanner-tests 0.4 ([#346](https://github.com/matatk/landmarks/issues/346)) ([ee13fdb](https://github.com/matatk/landmarks/commit/ee13fdbb421e97dbc94083f2ee74b6245a131dd8))
* Remove redundant writerOpts script; Renames ([#367](https://github.com/matatk/landmarks/issues/367)) ([aacec1d](https://github.com/matatk/landmarks/commit/aacec1d9a31f150bae212466576da53a67ba95d4))
* Switch to standard-version; Bump dependencies ([#344](https://github.com/matatk/landmarks/issues/344)) ([59abc6c](https://github.com/matatk/landmarks/commit/59abc6c6c335206517eba4b0780dfb83453d9666))


### Bug fixes

* Check dependency tree for modifications when caching code ([#359](https://github.com/matatk/landmarks/issues/359)) ([70b2719](https://github.com/matatk/landmarks/commit/70b2719f5b408930408a7b646afb75ddcad7e52d))
* **Options:** do not use aria-disabled for button ([#357](https://github.com/matatk/landmarks/issues/357)) ([748425c](https://github.com/matatk/landmarks/commit/748425c088df5902b486814c2cc50a2128849eac))
* Clarify migration manager behaviour; Clean up tests and logging ([#347](https://github.com/matatk/landmarks/issues/347)) ([a72fece](https://github.com/matatk/landmarks/commit/a72fece3bd65fc905c1377247d8330453949e2a6))
* Fix splash message colours and add landmark region ([#350](https://github.com/matatk/landmarks/issues/350)) ([068ec76](https://github.com/matatk/landmarks/commit/068ec76104f2c75873b30995c0fa2967e697997e))
* Floating disclosure widget style ([#374](https://github.com/matatk/landmarks/issues/374)) ([91da089](https://github.com/matatk/landmarks/commit/91da0891e85a99c60806a3dc134e1f1d3af68df9))
* **Profiling:** Correct the name of generated code ([#364](https://github.com/matatk/landmarks/issues/364)) ([7fcb074](https://github.com/matatk/landmarks/commit/7fcb0741b552d02aa7b187845ea28c74910a9552))
* Ignore aria-hidden and inert landmarks ([#360](https://github.com/matatk/landmarks/issues/360)) ([9ccf0c2](https://github.com/matatk/landmarks/commit/9ccf0c2bfa57afb18953db9569afafdd46e7c2bf))
* Include versionrc file for changelog generation ([#348](https://github.com/matatk/landmarks/issues/348)) ([5f56319](https://github.com/matatk/landmarks/commit/5f56319f1543b1ff35440661cb142775ae7804f2))
* Refine text colour fix to account for warnings ([#358](https://github.com/matatk/landmarks/issues/358)) ([d6abc66](https://github.com/matatk/landmarks/commit/d6abc665dd0ab16c0dfcb5810268c44d7493241a))
* Text colour in dark mode on Firefox ([#349](https://github.com/matatk/landmarks/issues/349)) ([728e02d](https://github.com/matatk/landmarks/commit/728e02d98cb415f5b1a62ac3f589f7cbbc750f7a))
* Text colour problem with previous dark-mode tweak ([#354](https://github.com/matatk/landmarks/issues/354)) ([40aed35](https://github.com/matatk/landmarks/commit/40aed35365a18d8583de6569ed3489c5e110c554))


### Tests

* Use nyc for code coverage ([#366](https://github.com/matatk/landmarks/issues/366)) ([982859a](https://github.com/matatk/landmarks/commit/982859a6fee47f4d147a2726c86797a593ef993e))


### Builds

* Cache flattened scripts; Option to skip linting ([#355](https://github.com/matatk/landmarks/issues/355)) ([956e416](https://github.com/matatk/landmarks/commit/956e4163f017cb4ee12e234d6e2fa750672aa0ba)), closes [#351](https://github.com/matatk/landmarks/issues/351)
* Fix logging logic error with cached PNG usage ([#361](https://github.com/matatk/landmarks/issues/361)) ([7b97583](https://github.com/matatk/landmarks/commit/7b9758364dc22651fa3234e334056d6e07b7391e))
* Use yargs in profile script; Fix debug code cacheing ([#365](https://github.com/matatk/landmarks/issues/365)) ([751d406](https://github.com/matatk/landmarks/commit/751d4067721bbaa115d33948daa602102ee37eec))


### Performance improvements

* Bring SVG-to-PNG conversion back in-house :-) ([#352](https://github.com/matatk/landmarks/issues/352)) ([7f28c2d](https://github.com/matatk/landmarks/commit/7f28c2d2f2407ba2b49b8a3503d6bc7f6d610f3a))
* Use sidebarAction.toggle() on Firefox ([#342](https://github.com/matatk/landmarks/issues/342)) ([f59e5fd](https://github.com/matatk/landmarks/commit/f59e5fd83677e26fa383c06231db4e94b548a3af))

## [2.7.0](https://github.com/matatk/landmarks/compare/2.6.0...2.7.0) (2020-02-11)

### Bug fixes

* Allow Landmarks to run on the stand-alone options page ([#328](https://github.com/matatk/landmarks/issues/328)) ([4e634bc](https://github.com/matatk/landmarks/commit/4e634bc))

### Builds

* Skip dotfiles when bringing in static assets ([#330](https://github.com/matatk/landmarks/issues/330)) ([79bde2d](https://github.com/matatk/landmarks/commit/79bde2d))
* Use additional deepmerge convenience function ([#326](https://github.com/matatk/landmarks/issues/326)) ([8bc2e91](https://github.com/matatk/landmarks/commit/8bc2e91)), closes [#324](https://github.com/matatk/landmarks/issues/324)

### Documentation

* **Mozilla Add-ons:** Update notes for reviewers ([#325](https://github.com/matatk/landmarks/issues/325)) ([0017bcb](https://github.com/matatk/landmarks/commit/0017bcb)), closes [#322](https://github.com/matatk/landmarks/issues/322)
* **README:** Mention Edge support ([#331](https://github.com/matatk/landmarks/issues/331)) ([b7d93af](https://github.com/matatk/landmarks/commit/b7d93af))
* Update extension metadata ([#333](https://github.com/matatk/landmarks/issues/333)) ([a445b5b](https://github.com/matatk/landmarks/commit/a445b5b))

### Features

* Dark mode and GUI style improvements ([#332](https://github.com/matatk/landmarks/issues/332)) ([c2653fe](https://github.com/matatk/landmarks/commit/c2653fe))
* Standalone options page; streamline help ([#327](https://github.com/matatk/landmarks/issues/327)) ([4aa2b60](https://github.com/matatk/landmarks/commit/4aa2b60)), closes [#227](https://github.com/matatk/landmarks/issues/227) [#288](https://github.com/matatk/landmarks/issues/288) [#226](https://github.com/matatk/landmarks/issues/226)
* Support the new Microsoft Edge ([#329](https://github.com/matatk/landmarks/issues/329)) ([a4d4743](https://github.com/matatk/landmarks/commit/a4d4743)), closes [#53](https://github.com/matatk/landmarks/issues/53)

## [2.6.0](https://github.com/matatk/landmarks/compare/2.5.5...2.6.0) (2019-09-06)

### Bug fixes

* Use specified spelling for "doc-acknowledgments" role; add en_US locale ([#315](https://github.com/matatk/landmarks/issues/315)) ([cfbfd6c](https://github.com/matatk/landmarks/commit/cfbfd6c))

### Builds

* Use factored-out package for generating/updating the changelog ([#313](https://github.com/matatk/landmarks/issues/313)) ([17a228a](https://github.com/matatk/landmarks/commit/17a228a))

### Chores

* **Dependencies:** Remove unused JSDOM; Bumps ([#314](https://github.com/matatk/landmarks/issues/314)) ([c6f1b00](https://github.com/matatk/landmarks/commit/c6f1b00))
* Bump to Node 10 on Travis ([#318](https://github.com/matatk/landmarks/issues/318)) ([cc0f2b0](https://github.com/matatk/landmarks/commit/cc0f2b0)), closes [#276](https://github.com/matatk/landmarks/issues/276)

### Documentation

* **README:** Refer to test suite documentation for standards su… ([#319](https://github.com/matatk/landmarks/issues/319)) ([129955f](https://github.com/matatk/landmarks/commit/129955f))
* Release notes for 2.6.0 ([#320](https://github.com/matatk/landmarks/issues/320)) ([43e194f](https://github.com/matatk/landmarks/commit/43e194f))

### Features

* Support aria-roledescription (also fix forms detection) ([#317](https://github.com/matatk/landmarks/issues/317)) ([711fb16](https://github.com/matatk/landmarks/commit/711fb16)), closes [#316](https://github.com/matatk/landmarks/issues/316)

### Tests

* Expected test results in tree format ([#311](https://github.com/matatk/landmarks/issues/311)) ([b530435](https://github.com/matatk/landmarks/commit/b530435))
* Use factored-out landmark scanner test suite ([#312](https://github.com/matatk/landmarks/issues/312)) ([a710d49](https://github.com/matatk/landmarks/commit/a710d49))

## [2.5.5](https://github.com/matatk/landmarks/compare/2.5.4...2.5.5) (2019-03-25)

### Bug fixes

* Remove page visibility event listener when content script gets disconnected on Chrome-like browsers ([#299](https://github.com/matatk/landmarks/issues/299)) ([5c514a2](https://github.com/matatk/landmarks/commit/5c514a2)), closes [#296](https://github.com/matatk/landmarks/issues/296)

### Build system

* Check there are no unexpected dotfiles ([#301](https://github.com/matatk/landmarks/issues/301)) ([6e095ad](https://github.com/matatk/landmarks/commit/6e095ad)), closes [#295](https://github.com/matatk/landmarks/issues/295)
* Remove Edge manifest and DRY DevTools key ([#300](https://github.com/matatk/landmarks/issues/300)) ([2aff6b4](https://github.com/matatk/landmarks/commit/2aff6b4)), closes [#294](https://github.com/matatk/landmarks/issues/294)
* Use ESLint's new (as of 5.13) syntax for configuring globals ([#304](https://github.com/matatk/landmarks/issues/304)) ([a111cee](https://github.com/matatk/landmarks/commit/a111cee))

### Chores

* Bump dependencies ([#298](https://github.com/matatk/landmarks/issues/298)) ([63e8791](https://github.com/matatk/landmarks/commit/63e8791))

### Documentation

* **Help:** Update for 2.5.5 ([#308](https://github.com/matatk/landmarks/issues/308)) ([a96f8b2](https://github.com/matatk/landmarks/commit/a96f8b2))

### Performance improvements

* Enhance profiling script help message ([#302](https://github.com/matatk/landmarks/issues/302)) ([19409dd](https://github.com/matatk/landmarks/commit/19409dd)), closes [#297](https://github.com/matatk/landmarks/issues/297)
* Perform the first scan for landmarks sooner ([#307](https://github.com/matatk/landmarks/issues/307)) ([4992396](https://github.com/matatk/landmarks/commit/4992396)), closes [#306](https://github.com/matatk/landmarks/issues/306)

## [2.5.4](https://github.com/matatk/landmarks/compare/2.5.3...2.5.4) (2019-03-21)

### Bug fixes

* **Help:** Ensure correct key handling for links ([#287](https://github.com/matatk/landmarks/issues/287)) ([8dc137a](https://github.com/matatk/landmarks/commit/8dc137a)), closes [#286](https://github.com/matatk/landmarks/issues/286)
* **Metadata:** Update build instructions for Firefox reviewers ([#290](https://github.com/matatk/landmarks/issues/290)) ([9461815](https://github.com/matatk/landmarks/commit/9461815)), closes [#284](https://github.com/matatk/landmarks/issues/284)
* **UI:** Help should open, from GUIs, in new page (regression) ([#289](https://github.com/matatk/landmarks/issues/289)) ([f07e58b](https://github.com/matatk/landmarks/commit/f07e58b)), closes [#285](https://github.com/matatk/landmarks/issues/285)

### Documentation

* Update extension-loading links and copyright date range ([#291](https://github.com/matatk/landmarks/issues/291)) ([ea3fbcc](https://github.com/matatk/landmarks/commit/ea3fbcc)), closes [#275](https://github.com/matatk/landmarks/issues/275) [#155](https://github.com/matatk/landmarks/issues/155)
* **Help:** Update for 2.5.4 ([#292](https://github.com/matatk/landmarks/issues/292)) ([f7d108f](https://github.com/matatk/landmarks/commit/f7d108f))

## [2.5.3](https://github.com/matatk/landmarks/compare/2.5.2...2.5.3) (2019-03-19)

### Bug fixes

* Move to simpler message passing ([#268](https://github.com/matatk/landmarks/issues/268)) ([0404b77](https://github.com/matatk/landmarks/commit/0404b77)), closes [#265](https://github.com/matatk/landmarks/issues/265)
* Support migration of user settings; Remove the debugInfo setting ([#272](https://github.com/matatk/landmarks/issues/272)) ([9f1924e](https://github.com/matatk/landmarks/commit/9f1924e))
* Ensure command descriptions appear on the help page on Firefox 66 ([#280](https://github.com/matatk/landmarks/issues/280)) ([0a3b6b2](https://github.com/matatk/landmarks/commit/0a3b6b2))

### Build system

* Remove Edge support for now ([#274](https://github.com/matatk/landmarks/issues/274)) ([ef55e8a](https://github.com/matatk/landmarks/commit/ef55e8a)), closes [#270](https://github.com/matatk/landmarks/issues/270)
* Support debug builds; build refactoring ([#279](https://github.com/matatk/landmarks/issues/279)) ([48e5aeb](https://github.com/matatk/landmarks/commit/48e5aeb)), closes [#271](https://github.com/matatk/landmarks/issues/271)

### Documentation

* **Help:** Explain how to modify keyboard shortcuts on Firefox ([#281](https://github.com/matatk/landmarks/issues/281)) ([086804b](https://github.com/matatk/landmarks/commit/086804b))
* **Help:** Update for 2.5.3 ([#282](https://github.com/matatk/landmarks/issues/282)) ([ae88692](https://github.com/matatk/landmarks/commit/ae88692))

### Performance improvements

* Mutation observation metrics ([#271](https://github.com/matatk/landmarks/issues/271)) ([171b16a](https://github.com/matatk/landmarks/commit/171b16a))
* Only observe mutations when the page is visible ([#273](https://github.com/matatk/landmarks/issues/273)) ([f1c0a01](https://github.com/matatk/landmarks/commit/f1c0a01)), closes [#269](https://github.com/matatk/landmarks/issues/269)

## [2.5.2](https://github.com/matatk/landmarks/compare/2.5.1...2.5.2) (2019-01-26)

### Bug fixes

* **UI:** Add missing focus styles to GUI links ([#260](https://github.com/matatk/landmarks/issues/260)) ([93e19e8](https://github.com/matatk/landmarks/commit/93e19e8))
* **UI:** Make pop-up/sidebar links into buttons that open new tabs ([#263](https://github.com/matatk/landmarks/issues/263)) ([071e944](https://github.com/matatk/landmarks/commit/071e944)), closes [#262](https://github.com/matatk/landmarks/issues/262)

### Build system

* Use path.join() more ([#264](https://github.com/matatk/landmarks/issues/264)) ([00b8708](https://github.com/matatk/landmarks/commit/00b8708))

### Documentation

* **Help:** Update with changes for version 2.5.2 ([#266](https://github.com/matatk/landmarks/issues/266)) ([7c5c2e4](https://github.com/matatk/landmarks/commit/7c5c2e4))

## [2.5.1](https://github.com/matatk/landmarks/compare/2.5.0...2.5.1) (2019-01-19)

### Bug fixes

* **UI:** Add help and preferences links to GUIs ([#253](https://github.com/matatk/landmarks/issues/253)) ([da628f9](https://github.com/matatk/landmarks/commit/da628f9)), closes [#250](https://github.com/matatk/landmarks/issues/250)
* **UI:** Clarify and clean up styles ([#254](https://github.com/matatk/landmarks/issues/254)) ([61109fa](https://github.com/matatk/landmarks/commit/61109fa))
* Change "show all landmarks" key to avoid Firefox clash ([#256](https://github.com/matatk/landmarks/issues/256)) ([8d73dbd](https://github.com/matatk/landmarks/commit/8d73dbd)), closes [#251](https://github.com/matatk/landmarks/issues/251)

### Build system

* Mozilla Add-ons build information script ([#255](https://github.com/matatk/landmarks/issues/255)) ([34501b7](https://github.com/matatk/landmarks/commit/34501b7)), closes [#252](https://github.com/matatk/landmarks/issues/252)

### Documentation

* **Help:** Update with changes for version 2.5.1 ([#257](https://github.com/matatk/landmarks/issues/257)) ([300109a](https://github.com/matatk/landmarks/commit/300109a))

## [2.5.0](https://github.com/matatk/landmarks/compare/2.4.3...2.5.0) (2019-01-14)

### Bug fixes

* **build:** Remove spurious .eslintrc.json from build and zip ([#242](https://github.com/matatk/landmarks/issues/242)) ([586bf90](https://github.com/matatk/landmarks/commit/586bf90))
* **UI:** Message consistency, visual text spacing, visual note spacing ([#247](https://github.com/matatk/landmarks/issues/247)) ([8c308af](https://github.com/matatk/landmarks/commit/8c308af))

### Build system

* Adopt conventional changelog and npm version scripts ([#239](https://github.com/matatk/landmarks/issues/239)) ([f5e0b39](https://github.com/matatk/landmarks/commit/f5e0b39))
* Make the whole build process synchronous ([#241](https://github.com/matatk/landmarks/issues/241)) ([1c81099](https://github.com/matatk/landmarks/commit/1c81099))

### Documentation

* **Help:** Describe new features; heading case consistency ([#248](https://github.com/matatk/landmarks/issues/248)) ([85c9659](https://github.com/matatk/landmarks/commit/85c9659))
* **README:** Fix typo; clarity and style improvements ([#240](https://github.com/matatk/landmarks/issues/240)) ([9968507](https://github.com/matatk/landmarks/commit/9968507)), closes [#232](https://github.com/matatk/landmarks/issues/232)

### Features

* Enhanced help documentation, bundled with the extension ([#237](https://github.com/matatk/landmarks/issues/237)) ([a8be495](https://github.com/matatk/landmarks/commit/a8be495))
* **toggle:** Show all landmarks keyboard shortcut ([#245](https://github.com/matatk/landmarks/issues/245)) ([10691ee](https://github.com/matatk/landmarks/commit/10691ee)), closes [#165](https://github.com/matatk/landmarks/issues/165)
* **toggle:** Show all landmarks UI ([#246](https://github.com/matatk/landmarks/issues/246)) ([0803ed7](https://github.com/matatk/landmarks/commit/0803ed7)), closes [#120](https://github.com/matatk/landmarks/issues/120)

2.4 series
----------

### 2.4.3 - 16th of December 2018

* Improve the appearance of the DevTools panel on Firefox. \[[\#217](https://github.com/matatk/landmarks/pull/217)\]
* Fix a bug whereby landmark updates for background tabs pages would show up in the pop-up if it's open. \[[\#216](https://github.com/matatk/landmarks/pull/216)\]
* Improve the profiling script considerably, and use the results to improve performance of landmark finding. \[[\#220](https://github.com/matatk/landmarks/pull/220)\]
* Fewer debug-mode log messages; tidy up metadata and improve screengrabs; bump dependencies. \[[\#218](https://github.com/matatk/landmarks/pull/218)\]
* Make the preferences/options UI clearer and more accessible; improve documentation and metadata; improve build robustosity. \[[\#228](https://github.com/matatk/landmarks/pull/228)\]

### 2.4.2 - 29th of October 2018

* Fix a bug with sidebar option initialisation. \[[\#213](https://github.com/matatk/landmarks/pull/213)\]

### 2.4.1 - 28th of October 2018

* Fix a bug with packaging that was causing the DevTools panel script to be left out of the zip file that gets uploaded to the browser add-on sites (oops again ;-)). \[[\#212](https://github.com/matatk/landmarks/pull/212)\]

### 2.4.0 - 28th of October 2018

* Offer an optional sidebar as well as the toolbar pop-up on Firefox and Opera. \[[\#188](https://github.com/matatk/landmarks/pull/188), [\#199](https://github.com/matatk/landmarks/pull/199)\]
* Provide a Developer Tools panel that allows landmark elements to be inspected in the DOM viewer. This also entailed re-writing the internal communications between parts of Landmarks to use ports instead of one-time messages. \[[\#204](https://github.com/matatk/landmarks/pull/204)\]
* Show the current keyboard shortcuts on the splash page and allow the user to update them on Chrome and Opera. \[[\#187](https://github.com/matatk/landmarks/pull/187)\]
* Fix a bug whereby if an element is removed from the page, its border would remain. Also, update the border if the highlighted element's size or position changes. \[[#210](https://github.com/matatk/landmarks/pull/210)\]
* Massive re-organisation of the code to make it easier to manage and accommodate and take advantage of cross-browser differences. \[[\#191](https://github.com/matatk/landmarks/pull/191)\]
* Several smaller code improvements, including: clean-ups to the generated code; efficiency and documentation improvements and new screengrabs and captions. \[[#207](https://github.com/matatk/landmarks/pull/207), [#209](https://github.com/matatk/landmarks/pull/209), [#211](https://github.com/matatk/landmarks/pull/211)\]

2.3 series
----------

### 2.3.1 - 9th of June 2018

* Support multiple labelling elements when `aria-labelledby` is used. \[[\#176](https://github.com/matatk/landmarks/pull/176)\]
* Keep labels legible, and borders neat, when landmark regions are narrow, or full-width/height. Also let pointer events through the border so the user can interact as normal with the page below. \[[\#179](https://github.com/matatk/landmarks/pull/179)\]
* Small refinements to the build process, documentation and error-handling. \[[\#174](https://github.com/matatk/landmarks/pull/174), [\#178](https://github.com/matatk/landmarks/pull/178)\]

### 2.3.0 - 17th of May 2018

* Add landmark labels to the border, which is now drawn more robustly and has customisable colour. \[[\#158](https://github.com/matatk/landmarks/pull/158), [\#162](https://github.com/matatk/landmarks/pull/162)\]
* Options are saved as they're changed by the user, and borders get updated to reflect settings changes immediately. \[[\#160](https://github.com/matatk/landmarks/pull/160)\]
* Fix text sometimes overflowing buttons in Firefox. \[[\#163](https://github.com/matatk/landmarks/pull/163)\]
* Minor tweaks to documentation, build process; library package bumps. \[[\#159](https://github.com/matatk/landmarks/pull/159), [\#161](https://github.com/matatk/landmarks/pull/161), [\#164](https://github.com/matatk/landmarks/pull/164)\]

2.2 series
----------

### 2.2.0 - 18th of February 2018

* Support [Digital Publishing ARIA module](https://www.w3.org/TR/dpub-aria-1.0/) landmarks, and makes landmark role names friendly and translatable. \[[\#150](https://github.com/matatk/landmarks/pull/150)\]
* Always scroll to the top of a landmark when moving to it. \[[\#151](https://github.com/matatk/landmarks/pull/151)\]
* Plumbing work on the build system and other code improvements. \[[\#145](https://github.com/matatk/landmarks/pull/145)\]

2.1 series
----------

### 2.1.1 - 19th of January 2018

* Improve performance on sites/apps that change rapidly (such as Google Docs) by limiting how quickly Landmarks responds to further changes when they're being made in quick succession. \[[\#139](https://github.com/matatk/landmarks/pull/139)\]
* Add a keyboard shortcut to show the landmarks pop-up. \[[\#135](https://github.com/matatk/landmarks/pull/135)\]
* Give the options page a title that shows up for Opera users. \[[\#136](https://github.com/matatk/landmarks/pull/136)\]
* Behind-the-scenes code and infrastructure improvements for improved quality. \[[\#124](https://github.com/matatk/landmarks/pull/124), [\#128](https://github.com/matatk/landmarks/pull/128), [\#129](https://github.com/matatk/landmarks/pull/129), [\#130](https://github.com/matatk/landmarks/pull/130), [\#142](https://github.com/matatk/landmarks/pull/142), [\#143](https://github.com/matatk/landmarks/pull/143)\]

### 2.1.0 - 6th of November 2017

* Landmarks are now updated when pages change dynamically (not just when the whole page is loaded). This should make the extension much more useful when working with web-apps and pages with pop-ups and slide-out menus, for example. \[[\#111](https://github.com/matatk/landmarks/pull/111)\]
* Add a keyboard shortcut to skip to the main landmark. \[[also \#111](https://github.com/matatk/landmarks/pull/111)\]
* Fix a bug whereby sibling landmarks may not be identified as such. \[[\#112](https://github.com/matatk/landmarks/pull/112)\]
* Adopt more browser-like UI on Firefox (pop-up and options) and Opera (options). \[[\#115](https://github.com/matatk/landmarks/pull/115)\]
* Use Mozilla's 'addons-linter' to check the built extension. \[[err, also \#111](https://github.com/matatk/landmarks/pull/111)\]

2.0 series
----------

### 2.0.8 - 18th of September 2017

* Landmarks now ignores visually hidden regions. \[[\#85](https://github.com/matatk/landmarks/pull/85)\]
* Fix a bug that caused the pop-up to incorrectly report nesting that changes by more than one level between landmarks. \[[\#102](https://github.com/matatk/landmarks/pull/102)\]
* Correctly restore elements' outlines after they are highlighted. \[[\#94](https://github.com/matatk/landmarks/pull/94)\]
* Automatically disable the extension on browsers' extensions store pages. \[[\#97](https://github.com/matatk/landmarks/pull/97)\]
* Start exploring what's needed for Edge support in future. \[[\#99](https://github.com/matatk/landmarks/pull/99)\]
* Improvements to the SVG to PNG process. \[[\#95](https://github.com/matatk/landmarks/pull/95)\]
* Other more minor tweaks and fixes.
* README updates.

### 2.0.7 - 11th of May 2017

* Officially support Opera.
* Make the landmark highlight more visible.
* Open a help page when the extension is installed/updated on Firefox (this was already supported on Chrome, and is on Opera).
* Make use of Firefox's synching of settings across devices.
* More tests, and numerous other code improvements behind the scenes.
* Partly works on Edge; still a few things to sort out before it's robust (also, the extensions store is not yet immediately open to submissions from allcomers).

### 2.0.6 - 2nd of February 2017

* Add a test suite to ensure landmarks are identified correctly.
* Various large internal code-quality improvements.

### 2.0.5 - 5th of December 2016

* No user-facing changes.
* Fix error in packaging (the new build system was not actually compressing the ZIP file, which different parts of the submission process for Chrome and Firefox didn't like&mdash;oops!)
* Add more code robustosity checks with ESLint.

### 2.0.4 - 4th of December 2016

* Clean up the appearance of the pop-up.
* Increase 'momentary' highlight duration to two seconds, from one second.
* Remove a workaround for a bug in Firefox pop-up sizing that was fixed in Firefox 50.
* Drop Grunt and switch to just using NPM and scripts for building the extensions.
* Track builds with Travis CI.
* Use ESLint and EditorConfig code standards and quality tools.

### 2.0.3 - 23rd of September 2016

* When installed/updated on Chrome, show the web page, with a (hopefully) helpful notice about the install/upgrade.
* Automatically re-inject the content script on Chrome when the extension is updated (or inject it when the extension is installed), as users would expect it to start working straight away. (Firefox does this itself.)
* Locale is now en\_GB (instead of en).
* Switch to using grunt-phantom-rasterize for converting the SVGs to PNGs.

### 2.0.2 - 12th of August 2016

* First WebExtension Release
