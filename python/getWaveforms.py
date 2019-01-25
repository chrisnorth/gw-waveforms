
# coding: utf-8


import gwcat
import numpy as np
import json
import os
import matplotlib.pyplot as plot
from pycbc.waveform import get_td_waveform
from astropy.table import Table
plot.ion()

dataDir='gwcat/data/'
gwc=gwcat.GWCat(os.path.join('gwcat/data/','events.json'))
newdata=json.load(open(os.path.join('gwcat/data/','gwosc.json')))
gwc.data = newdata['data']
gwc.json2dataframe()

# dplot=['GW150914','GW151226']
dplot=[]

events=gwc.data

# gwc.data['GW150914'].keys()

datain=gwc.data
wfs={}
for d in datain:
    if len(dplot)>0:
        try:
            idx=dplot.index(d)
        except:
            continue
    wfs[d]={}
    if 'best' in datain[d]['mass1']:
        wfs[d]["M1"]=datain[d]['mass1']['best']
    elif 'lim' in datain[d]['mass1']:
        lims=datain[d]['mass1']['lim']
        wfs[d]['M1']=0.5*(lims[0]+lims[1])
    if 'best' in datain[d]['mass2']:
        wfs[d]["M2"]=datain[d]['mass2']['best']
    elif 'lim' in datain[d]['mass2']:
        lims=datain[d]['mass2']['lim']
        wfs[d]['M2']=0.5*(lims[0]+lims[1])
    if 'best' in datain[d]['mchirp']:
        wfs[d]["Mchirp"]=datain[d]['mchirp']['best']
    elif 'lim' in datain[d]['mchirp']:
        lims=datain[d]['mchirp']['lim']
        wfs[d]['Mchirp']=0.5*(lims[0]+lims[1])
    if 'best' in datain[d]['distance']:
        wfs[d]["DL"]=datain[d]['distance']['best']


for d in wfs:
    m1=wfs[d]['M1']
    m2=wfs[d]['M2']
    mch=wfs[d]['Mchirp']
    K0=2.7e17 #Msun^5 s^-5

    if m1+m2 > 67:
        tres=1.0/4096
        f_lower=20
    elif m1+m2>5:
        tres=1.0/4096
        f_lower=25
    else:
        tres=1.0/8192
        f_lower=30
    wfs[d]['fmin']=f_lower
    f30=30
    f25=25
    tmin=K0**(1./3.) * mch**(-5./3.) * f_lower**(-8./3.)
    t30=K0**(1./3.) * mch**(-5./3.) * f30**(-8./3.)
    t25=K0**(1./3.) * mch**(-5./3.) * f25**(-8./3.)
    fitparam=[0.0029658 , 0.96112625]
    tmin=tmin*(mch*fitparam[0] + fitparam[1])
    t30=t30*(mch*fitparam[0] + fitparam[1])
    t25=t25*(mch*fitparam[0] + fitparam[1])
    wfs[d]['tmin']=tmin
    wfs[d]['t25']=t25
    wfs[d]['t30']=t30
    print('processing {}: {} + {} [{}] ({} MPc) at 1/{}s resolution from {}Hz [{:.2f}s from {:.2f}Hz]'.format(d,wfs[d]['M1'],wfs[d]['M2'],wfs[d]['Mchirp'],wfs[d]['DL'],1./tres,f_lower,t30,f30))
    # print(' t(30Hz) = {:.2}'.format(tmin))

    hp,hc = get_td_waveform(approximant="SEOBNRv3_opt_rk4",
                     mass1=wfs[d]['M1'],
                     mass2=wfs[d]['M2'],
                     delta_t=tres,
                     f_lower=f_lower,
                     distance=wfs[d]['DL'])
    t= hp.sample_times
    wfs[d]['data']=Table({'t':t,'hp':hp,'hc':hc})
    wfs[d]['data'].write('full-data/waveform_{}.csv'.format(d),format='ascii.csv',overwrite=True)
    print('  produced {:.2f}s from {:.2f}Hz'.format(-t[0],f_lower))
for d in wfs:
    if 'data' in wfs[d]:
        cropt=np.where(wfs[d]['data']['t']>-wfs[d]['t25'])[0]
        hp=wfs[d]['data']['hp'][cropt]
        t=wfs[d]['data']['t'][cropt]
        print('t25={:.2f}: {} samples'.format(wfs[d]['t25'],len(t)))
        print('compressing {}'.format(d))
        hp2=np.where(np.abs(hp)<1e-24,0,hp*1e23)
        wfs[d]['data2']=Table([t,hp2],names=['t','strain*1e23'])
        for l in range(len(wfs[d]['data2'])):
            wfs[d]['data2'][l]['t']=round(wfs[d]['data2'][l]['t'],5)
            wfs[d]['data2'][l]['strain*1e23']=round(wfs[d]['data2'][l]['strain*1e23'],1)
        wfs[d]['data2'].write('compressed/waveform_{}_compress.txt'.format(d),format='ascii.basic',delimiter=" ",overwrite=True)

i=0
plot.figure(1)
plot.clf()
for d in wfs:
    if 'data2' in wfs[d]:
        print(d,wfs[d]['data2']['t'][0],wfs[d]['tmin'])
        if 'data2' in wfs[d]:
            plot.plot(wfs[d]['data2']['t'],i*200+wfs[d]['data2']['strain*1e23'],label=d)
            i+=1
plot.legend()
plot.xlim(-0.5,0)

ms=[]
rs=[]
for d in wfs:
    ms.append(wfs[d]['Mchirp'])
    rs.append(-wfs[d]['tmin']/wfs[d]['data2']['t'][0])
plot.figure(2)
plot.clf()
plot.plot(ms,rs,'x')

xlim=plot.xlim()
param=np.polyfit(ms,rs,1)
yfit=param[0]*np.array(ms) + param[1]
plot.plot(ms,yfit)
plot.show()


