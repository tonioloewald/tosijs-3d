import{$e,Wo,ci}from"./site-ktydmw50.js";import{O}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class vm extends $e{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",O,NaN),this.default=this.registerDataInput("default",O),this.value=this.registerDataOutput("value",O);let s=this.config.cases||[];for(let t of s){if(t=ci(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,O))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Wo(s))t=this._getOutputValueForCase(ci(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function Sm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",vm)}Sm();
export{vm,Sm};

//# debugId=EDF13A99E5B6765164756E2164756E21
//# sourceMappingURL=site-bsb1tbjz.js.map
