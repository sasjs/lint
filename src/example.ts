import { lintFile, lintText } from './lint'
import path from 'path'

/**
 * Example which tests a piece of text with all known violations.
 */

const text = `/**
  @file
  @brief Returns an unused libref
  @details Use as follows:
  
    libname mclib0 (work);
    libname mclib1 (work);
    libname mclib2 (work);
  
    %let libref=%mf_getuniquelibref({SAS001});
    %put &=libref;
  
  which returns:
  
 > mclib3
  
  @param prefix= first part of libref.  Remember that librefs can only be 8 characters,
    so a 7 letter prefix would mean that maxtries should be 10.
  @param maxtries= the last part of the libref.  Provide an integer value.
  
  @version 9.2
  @author Allan Bowe
 **/
  
  
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
`

lintText(text).then((diagnostics) => {
  console.log('Text lint results:')
  console.table(diagnostics)
})

lintFile(path.join(__dirname, 'Example File.sas')).then((diagnostics) => {
  console.log('File lint results:')
  console.table(diagnostics)
})
