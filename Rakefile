prefix    = File.dirname( __FILE__ )

# Directory variables
src_dir   = File.join( prefix, 'src' )
build_dir = File.join( prefix, 'build' )
test_dir  = File.join( prefix, 'test' )

# A different destination directory can be set by
# setting DIST_DIR before calling rake
dist_dir  = ENV['DIST_DIR'] || File.join( prefix, 'dist' )

base_files = %w{transform transform.attributes transform.animate angle matrix matrix.calculations matrix.functions}.map { |js| File.join( src_dir, "jquery.#{js}.js" ) }

# General Variables
date       = `git log -1`[/^Date:\s+(.+)$/, 1]
version    = File.read( File.join( prefix, 'version.txt' ) ).strip

# jQuery files/dirs
jq         = File.join( dist_dir, "jquery.transform-#{version}.js" )
jq_min     = File.join( dist_dir, "jquery.transform-#{version}.min.js" )
jq_test    = File.join( dist_dir, "jquery.transform.js" )


# Build tools
rhino      = "java -jar \"#{build_dir}/js.jar\""
minfier    = "java -jar \"#{build_dir}/yuicompressor-2.4.2.jar\""

# Turn off output other than needed from `sh` and file commands
verbose(false) 

# Tasks
task :default => "all"

desc "Builds jQuery; Tests with JSLint; Minifies jQuery"
task :all => [:dist, :jquery, :lint, :min] do
  puts "jQuery build complete."
end

desc "Builds jQuery Transform: jquery.transform.js (Default task)"
task :jquery => [jq, jq_test]

desc "Builds a minified version of jQuery Transform: jquery.transform.min.js"
task :min => jq_min


task :init => [] do 
end

desc "Removes dist folder"
task :dist do
  puts "Removing Distribution directory: #{dist_dir}..." 
  rm_rf dist_dir
end

desc "Tests built jquery.transform.js against JSLint"
task :lint => jq do
  puts "Checking jQuery against JSLint..."
  sh "#{rhino} \"" + File.join(build_dir, 'jslint-check.js') + "\""
end


# File and Directory Dependencies
directory dist_dir

file jq => [dist_dir, base_files].flatten do
  puts "Building jquery.transform.js..."
  
  File.open(jq, 'w') do |f|
    f.write cat(base_files).gsub(/(Date:.)/, "\\1#{date}" ).gsub(/@VERSION/, version)
  end
end

file jq_min => jq do
  puts "Building jquery.transform.min.js..."
  sh "#{minfier} -o \"#{jq_min}\" \"#{jq}\""
end

file jq_test => jq do
  puts "Building a test version of Transform 3d..."
  cp jq, jq_test
end

def cat( files )
  files.map do |file|
    File.read(file)
  end.join('')
end