import { BaseOps } from "./base-ops";
import { MAX_SHIFT, MAX_VALUE, MIN_VALUE } from "./math-consts";

export class MathOps extends BaseOps {
	add(firstIndex: number, secondIndex: number, resultIndex: number) {
		this.addImmediate(
			firstIndex,
			this.regs.asUnsigned[secondIndex],
			resultIndex,
		);
	}

	addImmediate(
		firstIndex: number,
		immediateValue: number,
		resultIndex: number,
	) {
		if (this.regs.asUnsigned[firstIndex] > MAX_VALUE - immediateValue) {
			this.regs.asUnsigned[resultIndex] =
				MAX_VALUE -
				Math.max(this.regs.asUnsigned[firstIndex], immediateValue) +
				Math.min(this.regs.asUnsigned[firstIndex], immediateValue) -
				1;
		} else {
			this.regs.asUnsigned[resultIndex] =
				this.regs.asUnsigned[firstIndex] + immediateValue;
		}
	}

	mul(firstIndex: number, secondIndex: number, resultIndex: number) {
		this.mulImmediate(
			firstIndex,
			this.regs.asUnsigned[secondIndex],
			resultIndex,
		);
	}

	mulUpperUU(firstIndex: number, secondIndex: number, resultIndex: number) {
		this.mulUpperUUImmediate(
			firstIndex,
			this.regs.asUnsigned[secondIndex],
			resultIndex,
		);
	}

	mulUpperSS(firstIndex: number, secondIndex: number, resultIndex: number) {
		this.mulUpperSSImmediate(
			firstIndex,
			this.regs.asSigned[secondIndex],
			resultIndex,
		);
	}

	mulUpperSU(firstIndex: number, secondIndex: number, resultIndex: number) {
		this.mulUpperSSImmediate(
			firstIndex,
			this.regs.asUnsigned[secondIndex],
			resultIndex,
		);
	}

	mulImmediate(
		firstIndex: number,
		immediateValue: number,
		resultIndex: number,
	) {
		if (this.regs.asUnsigned[firstIndex] > MAX_VALUE / immediateValue) {
			const result =
				(BigInt(this.regs.asUnsigned[firstIndex]) * BigInt(immediateValue)) %
				2n ** 32n;
			this.regs.asUnsigned[resultIndex] = Number(result);
		} else {
			this.regs.asUnsigned[resultIndex] =
				this.regs.asUnsigned[firstIndex] * immediateValue;
		}
	}

	mulUpperSSImmediate(
		firstIndex: number,
		immediateValue: number,
		resultIndex: number,
	) {
		const result =
			(BigInt(this.regs.asSigned[firstIndex]) * BigInt(immediateValue)) >>
			BigInt(MAX_SHIFT);
		this.regs.asSigned[resultIndex] = Number(result % 2n ** 32n);
	}

	mulUpperUUImmediate(
		firstIndex: number,
		immediateValue: number,
		resultIndex: number,
	) {
		const result =
			(BigInt(this.regs.asUnsigned[firstIndex]) * BigInt(immediateValue)) >>
			BigInt(MAX_SHIFT);
		this.regs.asUnsigned[resultIndex] = Number(result % 2n ** 32n);
	}

	sub(firstIndex: number, secondIndex: number, resultIndex: number) {
		this.negAddImmediate(
			firstIndex,
			this.regs.asUnsigned[secondIndex],
			resultIndex,
		);
	}

	negAddImmediate(
		firstIndex: number,
		immediateValue: number,
		resultIndex: number,
	) {
		if (this.regs.asUnsigned[firstIndex] > immediateValue) {
			this.regs.asUnsigned[resultIndex] =
				MAX_VALUE - this.regs.asUnsigned[firstIndex] + immediateValue + 1;
		} else {
			this.regs.asUnsigned[resultIndex] =
				immediateValue - this.regs.asUnsigned[firstIndex];
		}
	}

	divSigned(firstIndex: number, secondIndex: number, resultIndex: number) {
		if (this.regs.asUnsigned[firstIndex] === 0) {
			this.regs.asUnsigned[resultIndex] = MAX_VALUE;
		} else if (
			this.regs.asSigned[firstIndex] === -1 &&
			this.regs.asSigned[secondIndex] === MIN_VALUE
		) {
			this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[secondIndex];
		} else {
			this.regs.asSigned[resultIndex] = ~~(
				this.regs.asSigned[secondIndex] / this.regs.asSigned[firstIndex]
			);
		}
	}

	divUnsigned(firstIndex: number, secondIndex: number, resultIndex: number) {
		if (this.regs.asUnsigned[firstIndex] === 0) {
			this.regs.asUnsigned[resultIndex] = MAX_VALUE;
		} else {
			this.regs.asUnsigned[resultIndex] = ~~(
				this.regs.asUnsigned[secondIndex] / this.regs.asUnsigned[firstIndex]
			);
		}
	}

	remSigned(firstIndex: number, secondIndex: number, resultIndex: number) {
		if (this.regs.asUnsigned[firstIndex] === 0) {
			this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[secondIndex];
		} else if (
			this.regs.asSigned[firstIndex] === -1 &&
			this.regs.asSigned[secondIndex] === MIN_VALUE
		) {
			this.regs.asUnsigned[resultIndex] = 0;
		} else {
			this.regs.asSigned[resultIndex] =
				this.regs.asSigned[secondIndex] % this.regs.asSigned[firstIndex];
		}
	}

	remUnsigned(firstIndex: number, secondIndex: number, resultIndex: number) {
		if (this.regs.asUnsigned[firstIndex] === 0) {
			this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[secondIndex];
		} else {
			this.regs.asUnsigned[resultIndex] =
				this.regs.asUnsigned[secondIndex] % this.regs.asUnsigned[firstIndex];
		}
	}
}
