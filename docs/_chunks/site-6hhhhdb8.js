import{$e}from"./site-j6ranrbs.js";import{Ye,w,Qt}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class _m extends $e{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",w),this.array=this.registerDataInput("array",w),this.index=this.registerDataOutput("index",Qt,new Ye(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new Ye(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function xm(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",_m)}xm();
export{_m,xm};

//# debugId=6ADF53A990FBF51964756E2164756E21
//# sourceMappingURL=site-6hhhhdb8.js.map
