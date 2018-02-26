# Module containing scripts to analyse waveform data

from astropy.table import Table,Column
from astropy import constants
from numpy import abs,min,sign,sqrt,random,arange
from scipy import where

def read_fits(file):
    tab=Table.read(file,format='fits')
    return(tab)

def txt2fits(file,fileOut):
    tab=read_txt(file)
    tab.write(fileOut,format='fits')
    return(tab)

def read_txt(file):
    tab=Table.read(file,format='ascii',names=['t','h_re','h_im'])
    tab.add_column(Column(sqrt(tab['h_re']**2 + tab['h_im']**2),name='modh'))
    return(tab)

def add_noise(data,sigma=1e-19,seed=None):
    # add Gaussian random noise
    if seed!=None:
        random.seed(seed)
    noise=random.normal(0,sigma,len(data))
    data['h_re']=data['h_re']+(1./sqrt(2))*noise
    data['h_im']=data['h_im']+(1./sqrt(2))*noise
    return(data)

def set_dist(data,distOut,distIn=1.e6):
    # adjust amplitude to match distance
    data['h_re']=data['h_re'] / (distOut/distIn)
    data['h_im']=data['h_im'] / (distOut/distIn)
    data['modh']=data['modh'] / (distOut/distIn)
    return(data)

def add_zeros(data,length=1):
    # add zeros to end of waveform
    dt=data['t'][-1]-data['t'][-2]
    nt=int(length/dt)-1
    # print 'dt=%g (%d)'%(dt,nt)
    tmax0=max(data['t'])
    tnew=arange(tmax0+dt,tmax0+length,dt)
    dataNew=Table({'t':data['t'].tolist()+tnew.tolist()})
    for col in data.colnames:
        if col=='t':
            continue
        else:
            dataNew.add_column(Column(data[col].tolist()+[0.]*nt,name=col))
    return(dataNew)

def calc_Mch(m1,m2):
    # calculate chirp mass
    mch = (m1*m2)**0.6 / (m1+m2)**0.2
    return(mch)

def getIdx(data,t):
    # get closest index to t=0
    relt=data['t']-t
    assert (max(relt)>=0 and min(relt)<=0),'time %g is not in data range [%g:%g]'%(t,min(data['t']),max(data['t']))
    idx=where(abs(relt)==min(abs(relt)))[0][0]
    return(idx)

def getHre(data,tIn):
    # interpolate data to get value of h_re at t=tIn
    i0=getIdx(data, tIn)
    t0=data['t'][i0]
    if i0>=len(data):
        i1=i0-1
    else:
        i1=i0+1
    t1=data['t'][i1]
    dt=t1-t0
    h0=data['h_re'][i0]
    h1=data['h_re'][i1]
    dh=h1-h0
    hOut=h0+(tIn-t0)*(dh)/(dt)
    return(hOut)

def getHim(data,tIn):
    # interpolate data to get value of h_re at t=tIn
    i0=getIdx(data, tIn)
    t0=data['t'][i0]
    if i0>=len(data):
        i1=i0-1
    else:
        i1=i0+1
    t1=data['t'][i1]
    h0=data['h_im'][i0]
    h1=data['h_im'][i1]
    hOut=h0+(tIn-t0)*(h1-h0)/(t1-t0)
    return(hOut)

def getModH(data,tIn):
    # interpolate data to get value of modh at t=tIn
    i0=getIdx(data, tIn)
    t0=data['t'][i0]
    if i0>=len(data)-1:
        i1=i0-1
    else:
        i1=i0+1
    t1=data['t'][i1]
    modh0=data['modh'][i0]
    modh1=data['modh'][i1]
    modhOut=modh0+(tIn-t0)*(modh1-modh0)/(t1-t0)
    return(modhOut)

def getFreq(data,tInit):
    # get frequency at t=tInit
    i0=getIdx(data,tInit)
    t0=data['t'][i0]
    h0=data['h_re'][i0]
    #work backwards to find a zero
    negFound=False
    while not negFound:
        t0=data['t'][i0]
        h0=data['h_re'][i0]
        i1=i0-1
        t1=data['t'][i1]
        h1=data['h_re'][i1]
        if sign(h1)==sign(h0):
            i0=i1
            continue
        else:
            grad=(h1-h0)/(t1-t0)
            tNeg0=t0 + (0-h0)/grad
            iNeg0=[i0,i1]
            negFound=True
    try:
        #work forwards to find a zero
        posFound=False
        while not posFound:
            t0=data['t'][i0]
            h0=data['h_re'][i0]
            i1=i0+1
            t1=data['t'][i1]
            h1=data['h_re'][i1]
            if sign(h1)==sign(h0):
                i0=i1
                continue
            else:
                grad=(h1-h0)/(t1-t0)
                tPos0=t0 + (0-h0)/grad
                iPos0=[i0,i1]
                posFound=True
        # calculate period
        period=2*(tPos0-tNeg0)
    except:
        i0=iNeg0[1]
        negFound2=False
        while not negFound2:
            t0=data['t'][i0]
            h0=data['h_re'][i0]
            i1=i0-1
            t1=data['t'][i1]
            h1=data['h_re'][i1]
            if sign(h1)==sign(h0):
                i0=i1
                continue
            else:
                grad=(h1-h0)/(t1-t0)
                tNeg20=t0 + (0-h0)/grad
                iNeg20=[i0,i1]
                negFound2=True
        # calculate period
        period=2*(tNeg20-tNeg0)
    # print 'period:',period
    freq=1./period

    return(freq)