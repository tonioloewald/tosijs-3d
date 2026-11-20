import{$e,Uo,ci}from"./site-x0v5x8t1.js";import{w}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Im extends $e{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",w,NaN),this.default=this.registerDataInput("default",w),this.value=this.registerDataOutput("value",w);let s=this.config.cases||[];for(let t of s){if(t=ci(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,w))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Uo(s))t=this._getOutputValueForCase(ci(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function wm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",Im)}wm();
export{Im,wm};

//# debugId=46C749A1E61E4B3564756E2164756E21
//# sourceMappingURL=site-z3mvsdnm.js.map
