const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to configure native iOS AVAudioSession for:
 * 1. Background Audio Playback (media continues playing when screen is locked or app is minimized)
 * 2. Picture-in-Picture (PiP) support
 */
const withBackgroundAudio = (config) => {
  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Add AVFoundation header
    if (!contents.includes('#import <AVFoundation/AVFoundation.h>')) {
      contents = '#import <AVFoundation/AVFoundation.h>\n' + contents;
    }

    // 2. Add AVAudioSession configuration to didFinishLaunchingWithOptions
    const audioSessionCode = `
  // [ZenTube] Configure audio session for background playback and Picture-in-Picture
  @try {
    NSError *audioError = nil;
    AVAudioSession *session = [AVAudioSession sharedInstance];
    [session setCategory:AVAudioSessionCategoryPlayback
                    mode:AVAudioSessionModeMoviePlayback
                 options:AVAudioSessionCategoryOptionMixWithOthers
                   error:&audioError];
    [session setActive:YES error:&audioError];
  } @catch (NSException *exception) {
    NSLog(@"[ZenTube] Failed to configure AVAudioSession: %@", exception);
  }
`;

    if (!contents.includes('AVAudioSessionCategoryPlayback')) {
      const targetMatch = contents.match(/didFinishLaunchingWithOptions[^{]*\{/);
      if (targetMatch) {
        const insertPos = targetMatch.index + targetMatch[0].length;
        contents = contents.slice(0, insertPos) + audioSessionCode + contents.slice(insertPos);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withBackgroundAudio;
