import{ze,na,Jt}from"./site-z8mqhr1b.js";import{R}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Yd extends ze{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",R,NaN),this.default=this.registerDataInput("default",R),this.value=this.registerDataOutput("value",R);let s=this.config.cases||[];for(let t of s){if(t=Jt(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,R))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(na(s))t=this._getOutputValueForCase(Jt(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var i=!1;function jd(){if(i)return;i=!0,a("FlowGraphDataSwitchBlock",Yd)}jd();
export{Yd,jd};

//# debugId=7B1321CC8454700864756E2164756E21
//# sourceMappingURL=site-q0a33e63.js.map
