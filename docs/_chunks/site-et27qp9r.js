import{$e}from"./site-3t3g319r.js";import{ct}from"./site-8r8s7x74.js";var l="cachedOperationValue",t="cachedExecutionId";class pr extends $e{constructor(e,i){super(i);this.value=this.registerDataOutput("value",e),this.isValid=this.registerDataOutput("isValid",ct)}_updateOutputs(e){let i=e._getExecutionVariable(this,t,-1),s=e._getExecutionVariable(this,l,null);if(s!==void 0&&s!==null&&i===e.executionId)this.isValid.setValue(!0,e),this.value.setValue(s,e);else try{let a=this._doOperation(e);if(a===void 0||a===null){this.isValid.setValue(!1,e);return}e._setExecutionVariable(this,l,a),e._setExecutionVariable(this,t,e.executionId),this.value.setValue(a,e),this.isValid.setValue(!0,e)}catch(a){this.isValid.setValue(!1,e)}}}
export{pr};

//# debugId=4BC0429C76627E8D64756E2164756E21
//# sourceMappingURL=site-et27qp9r.js.map
