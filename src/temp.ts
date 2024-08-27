import Moment from 'moment';

function main() {

  // const transactionTimeLocalWithOffset = DateFns.format(new Date(formSubmissionPayments[0].paymentTransaction.transactionTime), "yyyy-MM-dd HH:mm xxx")
  const transactionTimeLocalWithOffset = Moment("2024-08-27T10:12:03+1000").format("YYYY-MM-DD HH:mm Z");
  console.log("transactionTimeLocalWithOffset: " + transactionTimeLocalWithOffset)
}

main()