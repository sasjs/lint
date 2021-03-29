  
  
%macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
  %local x libref;
  %let x={SAS002};
   %do x=0 %to &maxtries;
	%if %sysfunc(libref(&prefix&x)) ne 0 %then %do;
  %let libref=&prefix&x;
    %let rc=%sysfunc(libname(&libref,%sysfunc(pathname(work))));
    %if &rc %then %put %sysfunc(sysmsg());
    &prefix&x
    %*put &sysmacroname: Libref &libref assigned as WORK and returned;
    %return;
  %end;
  %end;
  %put unable to find available libref in range &prefix.0-&maxtries;
  %mend;

