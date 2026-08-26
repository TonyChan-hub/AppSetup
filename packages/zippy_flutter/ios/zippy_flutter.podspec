#
# To learn more about a Podspec see http://guides.cocoapods.org/syntax/podspec.html
#
Pod::Spec.new do |s|
  s.name             = 'zippy_flutter'
  s.version          = '0.0.1'
  s.summary          = 'Flutter debug probe SDK for Zippy desktop inspector.'
  s.description      = <<-DESC
Flutter debug probe SDK for Zippy desktop inspector.
                       DESC
  s.homepage         = 'https://github.com/TonyChan-hub/AppSetup'
  s.license          = { :file => '../LICENSE' }
  s.author           = { 'Bear1210' => 'dev@example.com' }
  s.source           = { :path => '.' }
  s.source_files     = 'Classes/**/*'
  s.dependency 'Flutter'
  s.platform = :ios, '13.0'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386' }
  s.swift_version = '5.0'
end
