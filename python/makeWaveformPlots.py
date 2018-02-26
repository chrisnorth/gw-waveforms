# Wrapper script to make waveform plots

import waveform as wv
from numpy import array,zeros_like,linspace,arange,log10,pi,sqrt,zeros,ceil,round,mean
from scipy import where
import matplotlib.pyplot as plot
import matplotlib.patches as patches
from matplotlib.ticker import AutoMinorLocator
from astropy import constants
from astropy.table import Table,Column
import argparse
import os

plot.ion()

parser=argparse.ArgumentParser(description='Plot waveform plots')
parser.add_argument('-r','--recrop',action='store_true',help='set to re-crop data')
parser.add_argument('-s','--save',action='store_true',help='set to save data')
parser.add_argument('-l','--latex',action='store_true',help='set to write latex')
parser.add_argument('-n','--noplot',action='store_true',help='set to not make plots')

args=parser.parse_args()

recrop=args.recrop
save=args.save
latex=args.latex
noplot=args.noplot
# set masses
# m1=[5,10,15,20,30,40,50]
# m2=[5,10,15,20,30,40,50]

datasets={'m1':array([5.,30.,40.,20.,50.,15.,10.,50.]),
        'm2':array([5.,15.,20.,5.,40.,15.,5.,20.]),
        'dist_pc':array([0.8e6,2.2e6,3.8e6,1.4e6,5.4e6,2.8e6,1.1e6,1.5e6]),
        'labels':['D-1','D-2','D-3','D-4','D-5','D-6','D-7','D-8']}
# datasets={'m1':array([5.]),
#         'm2':array([5.]),
#         'dist_pc':array([0.8e6]),
#         'labels':['D-1']}

assert len(datasets['m1'])==len(datasets['m2']) and \
    len(datasets['dist_pc'])==len(datasets['m1']),\
    'Incorrect sizes of m1 / m2 / dist_pc: %d / %d / %d'%\
        (len(datasets['m1']),len(datasets['m2']),len(datasets['dist_pc']))
nd=len(datasets['m1'])

K0=(5**(3./8.)/(8.*pi))*(constants.c**3 / constants.G)**(5./8.)
K1=2.27e6
# light year in metres
ly=9.46e15

datasets['mch']=zeros_like(datasets['m1'])
datasets['dist_m']=zeros_like(datasets['m1'])
datasets['mratio']=zeros_like(datasets['m1'])
datasets['fileIn']=['']*nd
datasets['filePng']=['']*nd
datasets['filePdf']=['']*nd
datasets['filePs']=['']*nd
datasets['fileEps']=['']*nd
datasets['data']=['']*nd

for i in range(nd):
    m1=datasets['m1'][i]
    m2=datasets['m2'][i]

    mch=wv.calc_Mch(m1,m2) * constants.M_sun.value
    datasets['mch'][i]=mch
    dist_m = 1.e6 * constants.pc
    datasets['dist_m'][i]=dist_m.value
    datasets['mratio'][i]=m1/m2
    datasets['filePng'][i]='../Waveform/Outputs/Dataset_%s_waveforms.png'%(datasets['labels'][i])
    datasets['filePdf'][i]='../Waveform/Outputs/Dataset_%s_waveforms.pdf'%(datasets['labels'][i])
    datasets['filePs'][i]='../Waveform/Outputs/Dataset_%s_waveforms.ps'%(datasets['labels'][i])
    datasets['fileEps'][i]='../Waveform/Outputs/Dataset_%s_waveforms.eps'%(datasets['labels'][i])

    if recrop:
        fileInFits='../Waveform/data/m1-%d-m2-%d.fits'%(m1,m2)
        fileInFitsCropped='../Waveform/data/m1-%d-m2-%d_cropped.fits'%(m1,m2)
        datasets['fileIn'][i]==fileInFitsCropped
        print('')
        print('reading data for [%d,%d] from %s'%(m1,m2,fileInFits))
        dataInAll=wv.read_fits(fileInFits)
        print('data read (%d samples / %.1fs)'%(len(dataInAll),abs(min(dataInAll['t']))))
        if min(dataInAll['t'])>50:
            tarr=arange(ceil(min(dataInAll['t'])),0,5)
        else:
            tarr=arange(ceil(min(dataInAll['t'])),0,1)
        print('calculating %d derived quantities'%(len(tarr)))
        farr=zeros_like(tarr)
        hmodarr=zeros_like(tarr)
        for t in range(len(tarr)):
            farr[t]=wv.getFreq(dataInAll,tarr[t])
            hmodarr[t]=wv.getModH(dataInAll,tarr[t])
        distarr_t = K1 / (farr**2 * abs(tarr) * hmodarr) / dist_m.value
        mcharr_t = K0**(8./5) * farr**(-8./5.) * abs(tarr)**(-3./5.) / mch
        firstidx=where(abs(1.-distarr_t) < 1)[0]
        if len(firstidx)>0:
            t0=tarr[firstidx[0]] * 0.8
            excidx=where(dataInAll['t']<t0)[0]
            if len(excidx>0):
                print('removing %d/%d rows'%(len(excidx),len(dataInAll)))
                dataInAll.remove_rows(excidx)
        datasets['data'][i]=dataInAll
        dataInAll.write(fileInFitsCropped,format='fits',overwrite=True)

        plot.figure(i+1)
        plot.clf()
        plot.subplot(1,2,1)
        plot.title('%d : %d'%(m1,m2))
        plot.plot(dataInAll['t'],dataInAll['modh'])

        plot.subplot(1,2,2)
        plot.plot(tarr,1.-distarr_t)
        plot.axvline(dataInAll['t'][0])
        plot.ylim(-5,5)
    else:
        fileInFits='../Waveform/data/m1-%d-m2-%d_cropped.fits'%(m1,m2)
        datasets['fileIn'][i]==fileInFits
        print('')
        print('reading data for [%d,%d] from %s'%(m1,m2,fileInFits))
        datasets['data'][i]=wv.read_fits(fileInFits)

reltplot=array([0.9,0.6,0.3,0.1])
np=len(reltplot)
tplotarr=zeros([nd,np])
fplotarr=zeros_like(tplotarr)
hplotarr=zeros_like(tplotarr)
# mchplotarr=zeros_like(tplotarr)
# mch5plotarr=zeros_like(tplotarr)
# m1plotarr=zeros_like(tplotarr)
# m2plotarr=zeros_like(tplotarr)
for i in range(nd):
    print('Plotting %s [%.d,%d]'%\
        (datasets['labels'][i],datasets['m1'][i],datasets['m2'][i]))
    data=datasets['data'][i]
    data=wv.set_dist(data,datasets['dist_pc'][i])
    # data=wv.set_dist(data,1.e6)
    data_noise=data.copy()
    data_noise=wv.add_noise(data_noise,sigma=2.e-20,seed=i)
    print('Time range: %.1f:%.1f'%(data['t'][0],data['t'][-1]))
    trngs=[[]]*np
    irngs=[[]]*np
    hctrs=[[]]*np
    for r in range(np):
        idxctr=int(reltplot[r]*len(data))
        if idxctr>=len(data):
            idxctr=len(data)-1
        tctr=data['t'][idxctr]
        fctr=wv.getFreq(data,tctr)
        hctr=wv.getModH(data,tctr)
        trng=[tctr - 5./fctr , tctr + 5./fctr]
        if trng[1]>0.:
            fctr=wv.getFreq(data,0.01*data['t'][0])
            hctr=max(data['h_re'])
            trng=[-8./fctr,2./fctr]
            tctr=mean([trng[0],trng[1]])
            fctr=wv.getFreq(data,tctr)
            hctr=wv.getModH(data,tctr)
        if trng[1]>=max(data['t']):
            trng[1]=data['t'][-2]
        print('Time centre [range]: %.2f  [%.2f:%.2f] (%.4g)'%(tctr,trng[0],trng[1],hctr))
        irng=[wv.getIdx(data,trng[0]),wv.getIdx(data,trng[1])]
        trngs[r]=trng
        irngs[r]=irng
        hctrs[r]=hctr
        tplotarr[i,r]=-tctr
        fplotarr[i,r]=fctr
        hplotarr[i,r]=hctr

    if not noplot:
        fig=plot.figure(i+1,figsize=(8,11))
        fig.clf()
        axes=[]
        ylims=[]
        scales=[]
        for r in range(np):
            scales.append(-round(log10(max(data['h_re'][irngs[r][0]:irngs[r][1]]))))
        yscale_exp=max(scales)
        for r in range(np):

            ax=fig.add_subplot(np+1,1,r+2)
            # yscale_exp=-20
            # yscale_exp=-round(log10(max(data['h_re'][irngs[r][0]:irngs[r][1]])))
            yscale=10**yscale_exp
            ax.plot(-data_noise['t'][irngs[r][0]:irngs[r][1]],
                data_noise['h_re'][irngs[r][0]:irngs[r][1]]*yscale)
            ax.set_ylabel('Strain ($\mathrm{x} 10^{%g}$)'%(-yscale_exp))

            ax.set_xlim(-trngs[r][1],-trngs[r][0])
            ylim=max(abs(array(ax.get_ylim())))
            ylims.append(ylim)
            ax.set_ylim(-ylim,ylim)

            ax.grid('on',which='major',c='0.7',lw=1,ls='-')
            ax.minorticks_on()
            ax.grid('on',axis='x',which='minor',c='0.7',lw=1,ls=':')
            ax.xaxis.set_minor_locator(AutoMinorLocator(10))
            if r==np-1:
                ax.set_xlabel('Time before merger (s)')
            axes.append(ax)

        for r in range(np):
            axes[r].set_ylim(-max(ylims),max(ylims))
            axes[r].annotate(' Plot %d'%(r+1),(-trngs[r][1],-0.9*max(ylims)),color='g',fontweight='bold')

        # plot last frame
        ax=fig.add_subplot(np+1,1,1)
        # yscale_exp=-round(log10(max(data['h_re'])))
        # yscale=10**yscale_exp
        ax.plot(-data['t'],data['h_re']*yscale,lw=0.5)
        ax.set_xlim([-0.99*min(data['t']),-0.1])
        ax.set_ylabel('Strain ($\mathrm{x} 10^{%g}$)'%(-yscale_exp))
        ylim=max(abs(array(ax.get_ylim())))
        ylim=ylim/2.
        ax.set_ylim(-ylim,ylim)
        # ax.grid('on',which='major',c='0.7',lw=1,ls='-')
        ax.minorticks_on()
        # ax.grid('on',axis='x',which='minor',c='0.7',lw=1,ls=':')
        ax.xaxis.set_minor_locator(AutoMinorLocator(10))
        # ax.set_xlabel('Time before merger (s)')

        for r in range(np):
            ax.axvline(-trngs[r][0],color='g')
            ax.axvline(-trngs[r][1],color='g')
            ax.annotate(' %d'%(r+1),(-trngs[r][1],-0.9*ylim),color='g',fontweight='bold')
            ax.add_patch(patches.Rectangle((-trngs[r][1],-ylim),trngs[r][1]-trngs[r][0],\
                2*ylim,hatch='///',fill=False,color='g'))

        axbg=fig.add_axes([0,0,1,1],frameon=False,axisbg='None')
        axbg.annotate('Dataset %s'%(datasets['labels'][i]),(0.5,0.98),\
            ha='center',va='top',fontsize='x-large')
        axbg.annotate(r'Mass ratio: %.2f'%(datasets['mratio'][i]),(0.98,0.98),\
            ha='right',va='top',fontsize='large')
        axbg.grid('off',axis='both')
        axbg.set_xticks([])
        axbg.set_yticks([])
        # if r==0:
        #     plot.title()

        if save:
            plot.savefig(datasets['filePng'][i],dpi=300)
            plot.savefig(datasets['filePdf'][i])
            plot.savefig(datasets['filePs'][i])

        # plot.ylim(-hctrs[-1],hctrs[-1])

        plot.show()

mchplotarr = K0.value**(8./5) * fplotarr**(-8./5.) * tplotarr**(-3./5.) / constants.M_sun.value
mch5plotarr = mchplotarr**5.
rplotarr = (K1 / (hplotarr * tplotarr * fplotarr**2.)) / (ly * 1e6)
m1plotarr=zeros_like(tplotarr)
m2plotarr=zeros_like(tplotarr)
datasets['calctab']=[[]]*nd
for i in range(nd):
    calcTab=Table([arange(0,np)+1],names=['Panel'])
    mr=datasets['mratio'][i]
    m2plotarr[i,:] = (mch5plotarr[i,:] * (1. + mr) / mr**3)**(1./5.)
    m1plotarr[i,:] = m2plotarr[i,:] * mr
    calcTab.add_column(Column(round(tplotarr[i,:],2),name=r'Time $(\tau)$ [s]'))
    calcTab.add_column(Column(round(fplotarr[i,:],2),name=r'Frequency ($f$) [Hz]'))
    calcTab.add_column(Column(round(1.e20*hplotarr[i,:],2),name=r'Amplitude ($h$) $\times 10^{20}$'))
    # calcTab.add_column(Column(round(mch5plotarr[i,:],2),name=r'$M_{ch}^5$ [$M_\odot^5$]'))
    calcTab.add_column(Column(round(mchplotarr[i,:],2),name=r'$M_{ch}$ [$M_\odot$]'))
    calcTab.add_column(Column(round(m1plotarr[i,:],2),name=r'$M_{1}$ [$M_\odot$]'))
    calcTab.add_column(Column(round(m2plotarr[i,:],2),name=r'$M_{2}$ [$M_\odot$]'))
    calcTab.add_column(Column(round(rplotarr[i,:],2),name=r'$D$ [Mly]'))
    datasets['calctab'][i]=calcTab
    calcTab.write('Waveform-table-%s.tex'%datasets['labels'][i],format='latex',\
        latexdict={'tablealign':'h','preamble': r'\begin{center}','tablefoot': r'\end{center}'})

if latex:
    latexFile='Waveform_datasets.tex'
    lf=open(latexFile,'w')
    hdr=\
'''\documentclass[14pt,a4paper]{extarticle}
\usepackage{fullpage}
\usepackage[margin=0in]{geometry}
\usepackage{pdfpages}
\usepackage{graphicx}
\usepackage{epsfig}
\usepackage{nopageno}
\\title{Datasets}
\\author{}
\date{}
\\begin{document}
'''
    lf.write(hdr)
    for i in range(nd):
        txt='\\begin{figure}\n\centering\n\includegraphics[]{%s}\n\end{figure}\n\n'%\
            (datasets['filePdf'][i])
        # txt='\\begin{figure}\n\centering\n\epsfig{width=\\textwidth,file=%s}\n\end{figure}\n\n'%\
        #     (datasets['fileEps'][i].replace('.eps',''))
        # txt='\includepdf[width=\\textwidth]{%s}\n\n'%(datasets['filePdf'][i])
        lf.write(txt)
    lf.write('\end{document}')
    lf.close()
    os.system('pdflatex Waveform_datasets.tex')
    os.system('cp Waveform_datasets.pdf ../Waveform/')



    latexFileAnswers='Waveform_answers.tex'
    lfa=open(latexFileAnswers,'w')
    hdra=\
'''\documentclass[14pt,a4paper]{extarticle}
\usepackage{fullpage}
\usepackage[margin=0.5in,landscape]{geometry}
\
\usepackage{nopageno}
\\title{Datasets}
\\author{}
\date{}
\\begin{document}
'''
    lfa.write(hdra)
    for i in range(nd):
        txta='\section*{Dataset %s}\n\subsection*{$M_1=%d M_\odot$, $M_2 = %d M_\odot$, $M_1/M_2=%.2f$, $D=%.2f Mpc$}'%\
            (datasets['labels'][i],datasets['m1'][i],datasets['m2'][i],datasets['mratio'][i],datasets['dist_pc'][i]/1.e6)
        lfa.write(txta)
        txta='\input{./Waveform-table-%s.tex}\n\\clearpage\n'%(datasets['labels'][i])
        lfa.write(txta)
    lfa.write('\end{document}')
    lfa.close()
    os.system('pdflatex %s'%(latexFileAnswers))
    os.system('cp %s ../Waveform/'%(latexFileAnswers.replace('.tex','.pdf')))

