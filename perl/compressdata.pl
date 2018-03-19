#!/usr/bin/perl

$file = $ARGV[0];

if(!-e $file){
	print "Can't open $file\n";
	exit;
}

open(FILE,$file);
@lines = <FILE>;
close(FILE);

## t hp hc
#-4.233642577999999546e+00 0.000000000000000000e+00 -0.000000000000000000e+00
#-4.233520507687499546e+00 2.727401961866778036e-27 -5.026068104669233572e-27
#-4.233398437374999546e+00 1.148429134816075294e-26 -1.979312626758493692e-26

$file =~ s/\.txt/_compress.txt/;

open(FILE,">",$file);
$lines[0] =~ s/ hp hc/,strain * 1e23/;
print FILE $lines[0];
for($i = 1; $i < (@lines); $i++){
	$lines[$i] =~ s/[\n\r]//g;
	($t,$hp,$hc) = split(/ /,$lines[$i]);
	if(abs($hp) < 1e-24){ $hp = 0; }
	$hp *= 1e23;
	
	$t = sprintf("%0.5f",$t);
	#$hp = sprintf("%.3e",$hp);
	$hp = sprintf("%.1f",$hp);
	if($hp !~ /[1-9]/){ $hp = 0; }
	$hp =~ s/(\.[0-9]{1,})0+$/$1/g;
	$t =~ s/(\.[0-9]{1,})0+$/$1/g;
	$hp =~ s/\.0$//;
	print FILE $t.",".$hp."\n";
}
close(FILE);
